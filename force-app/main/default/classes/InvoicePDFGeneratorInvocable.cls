public with sharing class InvoicePDFGeneratorInvocable {

    @InvocableMethod(
        label='Generate Invoice PDF Automatically'
        description='Generates and saves Invoice PDF after Finance approval'
    )
    public static void generatePDF(List<Id> invoiceIds) {

        if (invoiceIds == null || invoiceIds.isEmpty()) {
            return;
        }

        // Avoid duplicate PDFs
        Set<Id> invoicesWithPDF = new Set<Id>();
        for (ContentDocumentLink cdl : [
            SELECT LinkedEntityId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :invoiceIds
        ]) {
            invoicesWithPDF.add(cdl.LinkedEntityId);
        }

        List<ContentVersion> versionsToInsert = new List<ContentVersion>();

        for (Id invoiceId : invoiceIds) {

            if (invoicesWithPDF.contains(invoiceId)) {
                continue; // already generated
            }

            PageReference pdfPage = Page.InvoicePDF;
            pdfPage.getParameters().put('id', invoiceId);

            Blob pdfBlob;
            if (Test.isRunningTest()) {
                pdfBlob = Blob.valueOf('TEST PDF');
            } else {
                pdfBlob = pdfPage.getContentAsPDF();
            }

            ContentVersion cv = new ContentVersion();
            cv.Title = 'Invoice_' + invoiceId;
            cv.PathOnClient = 'Invoice.pdf';
            cv.VersionData = pdfBlob;
            cv.FirstPublishLocationId = invoiceId;

            versionsToInsert.add(cv);
        }

        if (!versionsToInsert.isEmpty()) {
            insert versionsToInsert;
        }
    }
}