public class GrantAppPDFSaver {
    
    public Id recordId {get;set;}
    
    public GrantAppPDFSaver(ApexPages.StandardController controller) {
        this.recordId = controller.getId();
    }
    
    public PageReference savePDF() {
        
        List<ContentDocumentLink> existingFiles = [
            SELECT Id 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId 
            AND ContentDocument.Title LIKE 'Grant Application%'
            LIMIT 1
        ];

        if (!existingFiles.isEmpty()) {          
            PageReference returnPage = new PageReference('/' + recordId);
            returnPage.setRedirect(true);
            return returnPage;
        }
    
        PageReference pdfPage = Page.GrantApplication; 
        pdfPage.getParameters().put('id', recordId);
        
        Blob pdfBlob;
        try {
            if (Test.isRunningTest()) { 
                pdfBlob = Blob.valueOf('Unit Test Fake PDF Body');
            } else {
                pdfBlob = pdfPage.getContentAsPDF();
            }
        } catch (Exception e) {
            System.debug('Error generating PDF: ' + e.getMessage());
            return null; 
        }
        
        ContentVersion cv = new ContentVersion();
        cv.Title = 'Grant Application - ' + System.now().format('yyyy-MM-dd') + '.pdf';
        cv.PathOnClient = 'GrantApp.pdf';
        cv.VersionData = pdfBlob;
        cv.FirstPublishLocationId = recordId; 
        
        try {
            insert cv;
            Grant_Applicant__c appToUpdate = new Grant_Applicant__c(Id = recordId);           
            appToUpdate.PDF_Generated__c = true; 
            update appToUpdate;
        } catch (Exception e) {
            System.debug('Error saving file or updating record: ' + e.getMessage());
            
        }
        
        PageReference returnPage = new PageReference('/' + recordId);
        returnPage.setRedirect(true);
        return returnPage;
    }
}