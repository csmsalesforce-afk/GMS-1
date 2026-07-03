@RestResource(urlMapping='/fundingAction/*')
global without sharing class FundingRequestAction {

    @HttpGet
    global static void handleAction() {

        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String requestId = req.params.get('id');
        String action = req.params.get('action');

        System.debug('===== START FundingRequestAction =====');
        System.debug('Request Id: ' + requestId);
        System.debug('Action: ' + action);

        try {

            // STEP 1: Validate Parameters
            if(String.isBlank(requestId) || String.isBlank(action)){
                res.responseBody = Blob.valueOf('Missing parameters');
                return;
            }

            // Delegate to shared method
            processFundingRequestAction(requestId, action);

            res.responseBody = Blob.valueOf('Success : ' + action);

        }
        catch(Exception ex){

            System.debug('ERROR: ' + ex.getMessage());
            System.debug('STACKTRACE: ' + ex.getStackTraceString());

            res.responseBody =
                Blob.valueOf('Error : ' + ex.getMessage());
        }
    }

    public static void processFundingRequestAction(String requestId, String action) {
        // STEP 2: Fetch Funding Request
        Funding_Request__c fr = [
            SELECT Id,
                   Status__c,
                   Grant_Applicant__c,
                   Requested_Amount_FR__c
            FROM Funding_Request__c
            WHERE Id = :requestId
            LIMIT 1
        ];

        // Prevent duplicate processing
        if(fr.Status__c == 'Approved' || fr.Status__c == 'Rejected'){
            throw new IllegalArgumentException('Already processed');
        }

        // STEP 3: Update Funding Request Status
        // Handle both lowercase 'approve' (from old logic) and 'Approved' (from new LWC UI)
        if(action.equalsIgnoreCase('approve') || action.equalsIgnoreCase('Approved')){
            fr.Status__c = 'Approved';
        }
        else if(action.equalsIgnoreCase('reject') || action.equalsIgnoreCase('Rejected')){
            fr.Status__c = 'Rejected';
        }
        else{
            throw new IllegalArgumentException('Invalid action');
        }

        update fr;

        System.debug('Funding Request Updated');

        // STEP 4: Fetch Applicant
        Grant_Applicant__c applicant = [
            SELECT Id,
                   Approved_Requests__c,
                   Rejected_Requests__c,
                   Approved_Amount__c,
                   Total_Funding_Request__c,
                   Application_Status__c
            FROM Grant_Applicant__c
            WHERE Id = :fr.Grant_Applicant__c
            LIMIT 1
        ];

        // STEP 5: Handle Null Values
        if(applicant.Approved_Requests__c == null){
            applicant.Approved_Requests__c = 0;
        }

        if(applicant.Rejected_Requests__c == null){
            applicant.Rejected_Requests__c = 0;
        }

        if(applicant.Total_Funding_Request__c == null){
            applicant.Total_Funding_Request__c = 0;
        }

        // STEP 6: Update Counters
        if(fr.Status__c == 'Approved'){
            applicant.Approved_Requests__c += 1;
        }
        else{
            applicant.Rejected_Requests__c += 1;
        }

        // STEP 7: Calculate Approved Amount
        AggregateResult result = [
            SELECT SUM(Requested_Amount_FR__c) totalAmount
            FROM Funding_Request__c
            WHERE Grant_Applicant__c = :applicant.Id
            AND Status__c = 'Approved'
        ];

        applicant.Approved_Amount__c =
            result.get('totalAmount') == null
            ? 0
            : (Decimal)result.get('totalAmount');

        // STEP 8: Check All Requests Processed
        Boolean isAllProcessed =
            applicant.Total_Funding_Request__c > 0 &&
            applicant.Total_Funding_Request__c <=
            (applicant.Approved_Requests__c + applicant.Rejected_Requests__c);

        System.debug('TOTAL REQUESTS: ' + applicant.Total_Funding_Request__c);
        System.debug('PROCESSED REQUESTS: ' +
            (applicant.Approved_Requests__c + applicant.Rejected_Requests__c));

        // STEP 9: Update Applicant Status
        if(isAllProcessed){
            if (applicant.Rejected_Requests__c == applicant.Total_Funding_Request__c) {
                applicant.Application_Status__c = 'Rejected';
                System.debug('Application Status Updated to Rejected');
            } else {
                applicant.Application_Status__c = 'Revision Requested';
                System.debug('Application Status Updated to Revision Requested');
            }
        }

        // STEP 10: Update Applicant
        update applicant;

        System.debug('Applicant Updated');

        // STEP 11: Submit for Approval
        if(isAllProcessed && applicant.Application_Status__c == 'Revision Requested'){

            System.debug('Submitting for Approval');

            // Create Approval Request
            Approval.ProcessSubmitRequest reqApproval =
                new Approval.ProcessSubmitRequest();

            reqApproval.setObjectId(applicant.Id);

            // Approval Process API Name
            reqApproval.setProcessDefinitionNameOrId('Finance_Approval');

            // Submit Approval
            try {
                Approval.ProcessResult resultApproval = Approval.process(reqApproval);
                System.debug('Approval Submitted Successfully: ' + resultApproval.getInstanceId());
            } catch (Exception e) {
                System.debug('Approval Submission Failed: ' + e.getMessage());
            }
        }
        else{
            System.debug('Approval NOT Triggered');
        }
    }
}