public without sharing class InvoicePDFSaver {

    private Id recordId;

    public InvoicePDFSaver(ApexPages.StandardController controller) {
        recordId = controller.getId();
    }

    public PageReference savePDF() {

        PageReference pdfPage = Page.InvoicePDF;
        pdfPage.getParameters().put('id', recordId);

        Blob pdfBlob;
        if (Test.isRunningTest()) {
            pdfBlob = Blob.valueOf('TEST PDF');
        } else {
            pdfBlob = pdfPage.getContentAsPDF();
        }

        ContentVersion cv = new ContentVersion();
        cv.Title = 'Invoice - ' + recordId;
        cv.PathOnClient = 'Invoice.pdf';
        cv.VersionData = pdfBlob;
        insert cv;

        ContentVersion insertedCV = [
            SELECT ContentDocumentId
            FROM ContentVersion
            WHERE Id = :cv.Id
            LIMIT 1
        ];

        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.ContentDocumentId = insertedCV.ContentDocumentId;
        cdl.LinkedEntityId = recordId;
        cdl.ShareType = 'V';
        cdl.Visibility = 'AllUsers';
        insert cdl;

        // 🔔 Trigger Flow
        update new InvoiceForAward__c(
            Id = recordId,
            Invoice_PDF_Generated__c = true
        );

        PageReference pr = new PageReference('/' + recordId);
        pr.setRedirect(true);
        return pr;
    }
}