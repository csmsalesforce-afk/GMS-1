@RestResource(urlMapping='/DonorDashboard/*')
global without sharing class DonorDashboardRestController {

    @HttpGet
    global static void handleGet() {
        RestRequest  req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');
        String segment = lastSegment(req.requestURI);
        try {
            if (segment == 'agreements') {
                res.responseBody = Blob.valueOf(JSON.serialize(getAgreements()));
            } else if (segment == 'fundingrequests') {
                res.responseBody = Blob.valueOf(JSON.serialize(getFundingRequests()));
            } else if (segment == 'whoami') {
                res.responseBody = Blob.valueOf(JSON.serialize(new Map<String,String>{
                    'userId'   => UserInfo.getUserId(),
                    'userName' => UserInfo.getUserName(),
                    'name'     => UserInfo.getName(),
                    'userType' => UserInfo.getUserType()
                }));
            } else {
                res.statusCode = 404;
                res.responseBody = Blob.valueOf('{"error":"Not found"}');
            }
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error":"' + e.getMessage() + '"}');
        }
    }

    @HttpPost
    global static void handlePost() {
        RestRequest  req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');
        String segment = lastSegment(req.requestURI);
        try {
            Map<String,Object> body = (Map<String,Object>) JSON.deserializeUntyped(req.requestBody.toString());
            if (segment == 'agreements') {
                String result = updateAgreement((String)body.get('agreementId'), (String)body.get('action'));
                res.responseBody = Blob.valueOf(JSON.serialize(result));
            } else if (segment == 'fundingrequests') {
                updateFundingRequest((String)body.get('requestId'), (String)body.get('action'));
                res.responseBody = Blob.valueOf('"OK"');
            } else {
                res.statusCode = 404;
                res.responseBody = Blob.valueOf('{"error":"Not found"}');
            }
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error":"' + e.getMessage() + '"}');
        }
    }

    private static List<Donor_Agreement__c> getAgreements() {
        Id userId = UserInfo.getUserId();
        List<Donor__c> donors = [SELECT Id FROM Donor__c WHERE User__c = :userId LIMIT 1];
        if (donors.isEmpty()) return new List<Donor_Agreement__c>();
        Id donorId = donors[0].Id;
        return [
            SELECT Id, Name, Agreement_Name__c, Status__c,
                   Donor__r.Name, Program__r.Name, Agreement_With__r.Name,
                   Agreement_Amount__c, Total_Allocated__c, Total_Disbursed__c,
                   Remaining_Amount__c, Start_Date__c, End_Date__c,
                   Agreement_Duration__c, Renewal_Date__c, Agreement_Signed_Date__c,
                   Funding_Type__c, Reporting_Frequency__c, SLA_Days__c,
                   Funding_Purpose__c, Special_Conditions__c, Donor_Comments__c,
                   CreatedBy.Name, LastModifiedBy.Name, CreatedDate
            FROM Donor_Agreement__c
            WHERE Donor__c = :donorId
            ORDER BY CreatedDate DESC
        ];
    }

    private static List<Funding_Request__c> getFundingRequests() {
        Id userId = UserInfo.getUserId();
        List<Donor__c> donors = [SELECT Id FROM Donor__c WHERE User__c = :userId LIMIT 1];
        if (donors.isEmpty()) return new List<Funding_Request__c>();
        Id donorId = donors[0].Id;
        return [
            SELECT Id, Name, Status__c, Requested_Amount_FR__c, Justification__c,
                   Grant_Applicant__r.Name, Donor__r.Name,
                   CreatedBy.Name, CreatedDate, LastModifiedBy.Name, LastModifiedDate
            FROM Funding_Request__c
            WHERE Donor__c = :donorId
            ORDER BY CreatedDate DESC
        ];
    }

    private static String updateAgreement(Id agreementId, String action) {
        List<ProcessInstanceWorkitem> workItems = [
            SELECT Id, ActorId FROM ProcessInstanceWorkitem
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
    }

    private static void updateFundingRequest(Id requestId, String action) {
        Funding_Request__c fr = [SELECT Id FROM Funding_Request__c WHERE Id = :requestId];
        fr.Status__c = action;
        update fr;
    }

    private static String lastSegment(String uri) {
        List<String> parts = uri.split('/');
        return parts.isEmpty() ? '' : parts[parts.size() - 1].toLowerCase();
    }
}