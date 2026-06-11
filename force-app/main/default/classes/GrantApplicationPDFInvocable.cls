public without sharing class GrantApplicationPDFInvocable {

    @InvocableMethod(label='Generate Grant Application PDF')
    public static void generatePDF(List<Id> recordIds) {
        generatePDFFuture(recordIds);
    }

    @Future(callout=true)
    public static void generatePDFFuture(List<Id> recordIds) {
        
        // Use two parallel lists to keep track of relationships
        // This avoids the "Map Key" issue that caused your error
        List<ContentVersion> cvList = new List<ContentVersion>();
        List<Id> parentIdsList = new List<Id>();
        
        List<Grant_Applicant__c> appsToUpdate = new List<Grant_Applicant__c>();

        for (Id recordId : recordIds) {
            
            // 1. Check for existing PDF
            Integer existingFiles = [
                SELECT COUNT() FROM ContentDocumentLink 
                WHERE LinkedEntityId = :recordId 
                AND ContentDocument.Title LIKE 'Grant Application%'
            ];
            if (existingFiles > 0) continue;

            // 2. Generate PDF
            PageReference pdfPage = Page.GrantApplication;
            pdfPage.getParameters().put('id', recordId);
            
            Blob pdfBlob;
            try {
                pdfBlob = pdfPage.getContentAsPDF();
            } catch (Exception e) {
                pdfBlob = Blob.valueOf('Error generating PDF: ' + e.getMessage());
            }

            // 3. Prepare File
            ContentVersion cv = new ContentVersion();
            cv.Title = 'Grant Application - ' + Date.today().format();
            cv.PathOnClient = 'GrantApplication.pdf';
            cv.VersionData = pdfBlob;
            
            // Add to our parallel lists
            cvList.add(cv);
            parentIdsList.add(recordId);

            // 4. Prepare Record Update
            appsToUpdate.add(new Grant_Applicant__c(
                Id = recordId,
                PDF_Generated__c = true
            ));
        }

        // 5. Insert Files (Step 1)
        if (!cvList.isEmpty()) {
            insert cvList; 

            // 6. Link Files (Step 2)
            // We need to query ContentDocumentId
            Set<Id> cvIds = new Set<Id>();
            for (ContentVersion cv : cvList) {
                cvIds.add(cv.Id);
            }

            // Re-query to get ContentDocumentId
            Map<Id, ContentVersion> mapCV = new Map<Id, ContentVersion>(
                [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :cvIds]
            );

            List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();

            // Loop through using an index so we grab the matching Parent ID
            for (Integer i = 0; i < cvList.size(); i++) {
                ContentVersion cv = cvList[i];
                Id parentId = parentIdsList[i]; // Matches the file at the same index
                
                if (mapCV.containsKey(cv.Id)) {
                    ContentDocumentLink cdl = new ContentDocumentLink();
                    cdl.ContentDocumentId = mapCV.get(cv.Id).ContentDocumentId;
                    cdl.LinkedEntityId = parentId;
                    cdl.ShareType = 'V';
                    cdl.Visibility = 'AllUsers'; // Fixes the "Network" error
                    cdlList.add(cdl);
                }
            }

            if(!cdlList.isEmpty()) {
                insert cdlList;
            }
        }

        // 7. Update Records
        if (!appsToUpdate.isEmpty()) {
            update appsToUpdate;
        }
    }
}