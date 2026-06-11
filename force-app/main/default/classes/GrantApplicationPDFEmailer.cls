public with sharing class GrantApplicationPDFEmailer {

    @InvocableMethod(label='Send Grant Application PDF')
    public static void sendPDF(List<Id> grantApplicantIds) {

        if (grantApplicantIds.isEmpty()) return;
        Id grantApplicantId = grantApplicantIds[0];

        // 1️⃣ Get Applicant + Profile Email
        Grant_Applicant__c app = [
            SELECT Id,
                   Grant_Program__r.Primary_Contact_Email__c
            FROM Grant_Applicant__c
            WHERE Id = :grantApplicantId
            LIMIT 1
        ];

        String recipientEmail = app.Grant_Program__r.Primary_Contact_Email__c;
        if (String.isBlank(recipientEmail)) return;

        // 2️⃣ Get linked ContentDocumentIds
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :grantApplicantId
        ];

        if (links.isEmpty()) return;

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink l : links) {
            docIds.add(l.ContentDocumentId);
        }

        // 3️⃣ Get latest generated PDF
        ContentVersion cv = [
            SELECT Id, Title, VersionData
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds
            AND Title LIKE 'Grant Application%'
            AND IsLatest = TRUE
            LIMIT 1
        ];

        // 4️⃣ Create attachment
        Messaging.EmailFileAttachment attachment =
            new Messaging.EmailFileAttachment();
        attachment.setFileName(cv.Title + '.pdf');
        attachment.setBody(cv.VersionData);
        attachment.setContentType('application/pdf');

        // 5️⃣ Send email
        Messaging.SingleEmailMessage email =
            new Messaging.SingleEmailMessage();

        email.setToAddresses(new String[] { recipientEmail });
        email.setSubject('Grant Application Submitted – PDF Attached');
        email.setPlainTextBody(
            'Dear Applicant,\n\n' +
            'Your grant application has been successfully submitted.\n\n' +
            'Please find the submitted application PDF attached.\n\n' +
            'Regards,\nGrant Management Team'
        );

        email.setFileAttachments(
            new Messaging.EmailFileAttachment[] { attachment }
        );

        Messaging.sendEmail(
            new Messaging.SingleEmailMessage[] { email }
        );
    }
}