public with sharing class DonorAgreementEmailService {

    public class Request {
        @InvocableVariable(required=true)
        public Id agreementId;
    }

    @InvocableMethod(label='Send Agreement Email')
    public static void sendAgreementEmail(List<Request> requests) {

        List<Donor_Agreement__c> agreementsToUpdate = new List<Donor_Agreement__c>();
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

        for (Request req : requests) {

            Donor_Agreement__c agreement = [
                SELECT Id, Name, Status__c,
                       Agreement_Amount__c,
                       Start_Date__c, End_Date__c,
                       Funding_Purpose__c,
                       Donor__r.Email__c,
                       Donor__r.Name
                FROM Donor_Agreement__c
                WHERE Id = :req.agreementId
                LIMIT 1
            ];

            // 🚫 Prevent duplicate send
            if (agreement.Status__c == 'Sent to Donor') {
                continue;
            }

            if (agreement.Donor__r.Email__c == null) {
                continue;
            }

            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();

            mail.setToAddresses(new List<String>{agreement.Donor__r.Email__c});
            mail.setSubject('Donor Agreement Proposal - ' + agreement.Name);

            String body = 'Dear ' + agreement.Donor__r.Name + ',\n\n' +
                'Agreement Name: ' + agreement.Name + '\n' +
                'Amount: ' + agreement.Agreement_Amount__c + '\n' +
                'Start Date: ' + agreement.Start_Date__c + '\n' +
                'End Date: ' + agreement.End_Date__c + '\n' +
                'Purpose: ' + agreement.Funding_Purpose__c + '\n\n' +
                'Please review and confirm.\n\nThanks';

            mail.setPlainTextBody(body);

            emails.add(mail);

            agreement.Status__c = 'Sent to Donor';
            agreementsToUpdate.add(agreement);
        }

        if (!emails.isEmpty()) {
            Messaging.sendEmail(emails);
        }

        if (!agreementsToUpdate.isEmpty()) {
            update agreementsToUpdate;
        }
    }
}