public without sharing class DonorDashboardController {

    // 🔷 GET AGREEMENTS
    @AuraEnabled(cacheable=true)
    public static List<Donor_Agreement__c> getDonorAgreements() {
        Id userId = UserInfo.getUserId();

        return [
            SELECT Id,
                   Name,
                   Agreement_Name__c,
                   Status__c,
                   Donor__r.Name,
                   Program__r.Name,
                   Agreement_With__r.Name,

                   Agreement_Amount__c,
                   Total_Allocated__c,
                   Total_Disbursed__c,
                   Remaining_Amount__c,

                   Start_Date__c,
                   End_Date__c,
                   Agreement_Duration__c,
                   Renewal_Date__c,
                   Agreement_Signed_Date__c,

                   Funding_Type__c,
                   Reporting_Frequency__c,
                   SLA_Days__c,

                   Funding_Purpose__c,
                   Special_Conditions__c,
                   Donor_Comments__c,

                   CreatedBy.Name,
                   LastModifiedBy.Name,
                   CreatedDate
            FROM Donor_Agreement__c
            WHERE Donor__r.User__c = :userId
            ORDER BY CreatedDate DESC
        ];
    }

    // 🔷 APPROVAL ACTION
    @AuraEnabled
    public static String updateAgreementStatus(Id agreementId, String action) {

        try {
            List<ProcessInstanceWorkitem> workItems = [
                SELECT Id, ActorId
                FROM ProcessInstanceWorkitem
                WHERE ProcessInstance.TargetObjectId = :agreementId
            ];

            if (workItems.isEmpty()) return 'NOT_IN_APPROVAL';

            for (ProcessInstanceWorkitem wi : workItems) {

                if (wi.ActorId == UserInfo.getUserId()) {

                    Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
                    req.setWorkitemId(wi.Id);
                    req.setComments('Donor Action');

                    req.setAction(action == 'Approved' ? 'Approve' : 'Reject');

                    Approval.process(req);
                    return 'SUCCESS';
                }
            }

            return 'NOT_ASSIGNED';

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // 🔷 FUNDING REQUESTS
    @AuraEnabled(cacheable=true)
    public static List<Funding_Request__c> getFundingRequests() {
        Id userId = UserInfo.getUserId();

        return [
            SELECT Id,
                   Name,
                   Status__c,
                   Requested_Amount_FR__c,
                   Justification__c,
                   Grant_Applicant__r.Name,
                   Donor__r.Name,
                   CreatedBy.Name,
                   CreatedDate,
                   LastModifiedBy.Name,
                   LastModifiedDate
            FROM Funding_Request__c
            WHERE Donor__r.User__c = :userId
            ORDER BY CreatedDate DESC
        ];
    }

    // 🔷 UPDATE FUNDING
    @AuraEnabled
    public static void updateFundingRequest(Id requestId, String action) {
        // Delegate business logic to shared handler class
        FundingRequestAction.processFundingRequestAction((String)requestId, action);
    }
}