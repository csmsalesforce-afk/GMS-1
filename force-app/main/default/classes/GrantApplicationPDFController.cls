public without sharing class GrantApplicationPDFController {

    public Grant_Applicant__c app { get; private set; }

    public GrantApplicationPDFController() {

        Id recordId = ApexPages.currentPage().getParameters().get('id');

        List<Grant_Applicant__c> apps = [
            SELECT Name,
                   Applicant_Name__c,
                   Application_Status__c,
                   Region__c,
                   Country__c,
                   Project_Title__c,
                   Project_Description__c,
                   Start_Date__c,
                   End_Date__c,
                   Requested_Amount__c,
                   Submission_Date__c,
                   Grant_Program__r.Name
            FROM Grant_Applicant__c
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (!apps.isEmpty()) {
            app = apps[0];
        }
    }
}