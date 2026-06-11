public class GrantApplicationPDFHandler {

    @future(callout=true)
    public static void attachPDFToRecord(Set<Id> recordIds) {
        
        List<ContentDocumentLink> existingFiles = [
            SELECT LinkedEntityId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId IN :recordIds 
            AND ContentDocument.Title = 'Grant Application.pdf' 
        ];

        // Create a set of IDs that should be SKIPPED
        Set<Id> existingPdfIds = new Set<Id>();
        for (ContentDocumentLink link : existingFiles) {
            existingPdfIds.add(link.LinkedEntityId);
        }

        List<ContentVersion> filesToInsert = new List<ContentVersion>();

        // 2. Loop through the records triggered
        for (Id recId : recordIds) {
            
            // STOP: If we found this ID in our existing list, skip it!
            if (existingPdfIds.contains(recId)) {
                continue; 
            }

            // --- Standard PDF Generation Logic Starts Here ---
            PageReference pdfPage = Page.GrantApplication; // Replace with your VF Page Name
            pdfPage.getParameters().put('id', recId);

            Blob pdfBlob;
            try {
                if (Test.isRunningTest()) { 
                    pdfBlob = Blob.valueOf('Unit Test Fake PDF');
                } else {
                    pdfBlob = pdfPage.getContentAsPDF();
                }
            } catch (Exception e) {
                System.debug('Error generating PDF: ' + e.getMessage());
                continue;
            }

            ContentVersion cv = new ContentVersion();
            cv.Title = 'Grant Application.pdf'; // This name must match the check above
            cv.PathOnClient = 'Grant_Application.pdf';
            cv.VersionData = pdfBlob;
            cv.FirstPublishLocationId = recId;
            
            
            filesToInsert.add(cv);
        }

        // 3. Insert only the new files
        if (!filesToInsert.isEmpty()) {
            insert filesToInsert;
        }
    }
}