global class InvoiceForAwardPDFBatch
implements Database.Batchable<SObject> {

    global Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id,
                   Name,
                   Invoice_Date__c,
                   Requested_Amount__c,
                   Finance_Approved_Amount__c,
                   Award__r.Account__r.Primary_Contact_Email__c
            FROM InvoiceForAward__c
            WHERE Invoice_PDF_Generated__c = FALSE
        ]);
    }

    global void execute(Database.BatchableContext bc, List<InvoiceForAward__c> scope) {

        List<ContentVersion> files = new List<ContentVersion>();
        List<InvoiceForAward__c> updates = new List<InvoiceForAward__c>();
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (InvoiceForAward__c inv : scope) {

            if (String.isBlank(inv.Award__r.Account__r.Primary_Contact_Email__c)) {
                continue; // no email → skip safely
            }

            try {
                // Generate PDF
                PageReference pdfPage = Page.InvoicePDF;
                pdfPage.getParameters().put('id', inv.Id);
                Blob pdfBlob = pdfPage.getContentAsPDF();

                // Save File
                ContentVersion cv = new ContentVersion();
                cv.Title = 'Invoice - ' + inv.Name;
                cv.PathOnClient = 'Invoice_' + inv.Name + '.pdf';
                cv.VersionData = pdfBlob;
                cv.FirstPublishLocationId = inv.Id;
                files.add(cv);

                // Prepare Email
                Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
                mail.setToAddresses(
                    new String[] { inv.Award__r.Account__r.Primary_Contact_Email__c }
                );
                mail.setSubject('Invoice ' + inv.Name + ' – PDF Generated');
                mail.setPlainTextBody(
                    'Dear Applicant,\n\n' +
                    'Your invoice has been generated successfully.\n\n' +
                    'Invoice Number: ' + inv.Name + '\n' +
                    'Invoice Date: ' + inv.Invoice_Date__c + '\n' +
                    'Requested Amount: ' + inv.Requested_Amount__c + '\n' +
                    'Approved Amount: ' + inv.Finance_Approved_Amount__c + '\n\n' +
                    'Please find the invoice PDF attached.\n\n' +
                    'Regards,\nFinance Team'
                );

                // Attach PDF
                Messaging.EmailFileAttachment attach =
                    new Messaging.EmailFileAttachment();
                attach.setFileName('Invoice_' + inv.Name + '.pdf');
                attach.setBody(pdfBlob);
                mail.setFileAttachments(
                    new Messaging.EmailFileAttachment[] { attach }
                );

                emails.add(mail);

                // Mark as generated
                updates.add(new InvoiceForAward__c(
                    Id = inv.Id,
                    Invoice_PDF_Generated__c = TRUE
                ));

            } catch (Exception e) {
                System.debug('Invoice PDF/Email failed: ' + e.getMessage());
            }
        }

        if (!files.isEmpty()) insert files;
        if (!emails.isEmpty()) Messaging.sendEmail(emails);
        if (!updates.isEmpty()) update updates;
    }

    global void finish(Database.BatchableContext bc) {}
}