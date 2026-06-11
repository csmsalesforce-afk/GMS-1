global without sharing class GrantApplicationPDFBatch
    implements Database.Batchable<SObject>, Database.AllowsCallouts {

    global Database.QueryLocator start(Database.BatchableContext bc) {

        return Database.getQueryLocator([
            SELECT Id
            FROM Grant_Applicant__c
            WHERE Application_Status__c = 'Submitted'
            AND PDF_Generated__c = false
        ]);
    }

    global void execute(Database.BatchableContext bc, List<Grant_Applicant__c> scope) {

        List<ContentVersion> files = new List<ContentVersion>();
        List<Grant_Applicant__c> updates = new List<Grant_Applicant__c>();

        for (Grant_Applicant__c app : scope) {

            PageReference pdfPage = Page.GrantApplication;
            pdfPage.getParameters().put('id', app.Id);

            Blob pdfBlob;
            try {
                pdfBlob = pdfPage.getContentAsPDF();
            } catch (Exception e) {
                continue;
            }

            ContentVersion cv = new ContentVersion();
            cv.Title = 'Grant Application - ' + Date.today().format();
            cv.PathOnClient = 'GrantApplication.pdf';
            cv.VersionData = pdfBlob;

            // 🔥 Attach file safely (Admin context)
            cv.FirstPublishLocationId = app.Id;


            files.add(cv);

            updates.add(new Grant_Applicant__c(
                Id = app.Id,
                PDF_Generated__c = true
            ));
        }

        if (!files.isEmpty()) {
            insert files;
        }

        if (!updates.isEmpty()) {
            update updates;
        }
    }

    global void finish(Database.BatchableContext bc) {
        // Optional: logging or notification
    }
}