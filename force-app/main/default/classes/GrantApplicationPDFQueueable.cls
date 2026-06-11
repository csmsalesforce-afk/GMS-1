public without sharing class GrantApplicationPDFQueueable implements Queueable, Database.AllowsCallouts {

    private List<Id> recordIds;

    public GrantApplicationPDFQueueable(List<Id> recordIds) {
        this.recordIds = recordIds;
    }

    public void execute(QueueableContext context) {
        
        List<ContentVersion> cvList = new List<ContentVersion>();
        List<Id> parentIdsList = new List<Id>();
        List<Grant_Applicant__c> appsToUpdate = new List<Grant_Applicant__c>();
        
        // List to hold records that we might need to re-lock later
        List<Id> recordsToRelock = new List<Id>();

        // 1. Query Applications
        List<Grant_Applicant__c> applications = [
            SELECT Id, PDF_Generated__c
            FROM Grant_Applicant__c
            WHERE Id IN :recordIds
        ];

        for (Grant_Applicant__c app : applications) {

            if (app.PDF_Generated__c == true) continue;

            // Generate PDF
            PageReference pdfPage = Page.GrantApplication;
            pdfPage.getParameters().put('id', app.Id);

            Blob pdfBlob;
            if (Test.isRunningTest()) {
                pdfBlob = Blob.valueOf('Test PDF');
            } else {
                try {
                    pdfBlob = pdfPage.getContentAsPDF();
                } catch (Exception e) {
                    System.debug('Error generating PDF: ' + e.getMessage());
                    continue; 
                }
            }

            // 2. Prepare File (Private first)
            ContentVersion cv = new ContentVersion();
            cv.Title = 'Grant Application - ' + Date.today().format();
            cv.PathOnClient = 'GrantApplication.pdf';
            cv.VersionData = pdfBlob;
            
            cvList.add(cv);
            parentIdsList.add(app.Id); 

            appsToUpdate.add(new Grant_Applicant__c(
                Id = app.Id,
                PDF_Generated__c = true
            ));
        }

        // 3. Insert Files
        if (!cvList.isEmpty()) {
            insert cvList;

            Set<Id> cvIds = new Set<Id>();
            for (ContentVersion cv : cvList) {
                cvIds.add(cv.Id);
            }

            Map<Id, ContentVersion> mapCV = new Map<Id, ContentVersion>(
                [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :cvIds]
            );

            List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
            
            // Check for Locking before creating links
            // (If record is locked, we must unlock it to attach file)
            Map<Id, Boolean> wasLocked = new Map<Id, Boolean>();
            for(Id pid : parentIdsList) {
                if(Approval.isLocked(pid)) {
                    wasLocked.put(pid, true);
                    // Unlock the record temporarily
                    Approval.UnlockResult lr = Approval.unlock(pid);
                }
            }

            // Loop to Create Links
            for (Integer i = 0; i < cvList.size(); i++) {
                ContentVersion cv = cvList[i];
                Id parentId = parentIdsList[i]; 

                if (mapCV.containsKey(cv.Id)) {
                    ContentDocumentLink cdl = new ContentDocumentLink();
                    cdl.ContentDocumentId = mapCV.get(cv.Id).ContentDocumentId;
                    cdl.LinkedEntityId = parentId;
                    cdl.ShareType = 'V'; // Viewer
                    
                    // REMOVED: cdl.Visibility = 'AllUsers'; 
                    // REASON: This line causes the crash for Community Users.
                    // Leaving it null allows Salesforce to set the correct Community visibility.
                    
                    cdlList.add(cdl);
                }
            }

            if (!cdlList.isEmpty()) {
                insert cdlList;
            }
            
            // Re-lock records if they were locked
            List<Id> lockList = new List<Id>();
            for(Id pid : wasLocked.keySet()) {
                lockList.add(pid);
            }
            if(!lockList.isEmpty()) {
                Approval.lock(lockList);
            }
        }

        // 5. Update Records
        if (!appsToUpdate.isEmpty()) {
            // Unlocking might be needed here too if field update fails
             List<Id> lockedForUpdate = new List<Id>();
             for(Grant_Applicant__c ga : appsToUpdate) {
                 if(Approval.isLocked(ga.Id)) {
                     Approval.unlock(ga.Id);
                     lockedForUpdate.add(ga.Id);
                 }
             }
             
            update appsToUpdate;
            
            if(!lockedForUpdate.isEmpty()) {
                Approval.lock(lockedForUpdate);
            }
        }
    }
}