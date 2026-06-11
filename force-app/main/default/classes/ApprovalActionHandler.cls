public class ApprovalActionHandler {

    public class Request {
        @InvocableVariable(required=true)
        public Id recordId;
        
        @InvocableVariable(required=true)
        public String action; // "Approve" or "Reject"
    }

    @InvocableMethod(label='Process Approval/Rejection')
    public static void processApproval(List<Request> requests) {

        for(Request reqItem : requests) {

            try {
                // Get pending approval work item
                ProcessInstanceWorkitem workItem = [
                    SELECT Id
                    FROM ProcessInstanceWorkitem
                    WHERE ProcessInstance.TargetObjectId = :reqItem.recordId
                    LIMIT 1
                ];

                // Create approval request
                Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
                req.setWorkitemId(workItem.Id);

                // Set action
                if(reqItem.action != null && reqItem.action.equalsIgnoreCase('Reject')) {
                    req.setAction('Reject');
                } else {
                    req.setAction('Approve');
                }

                // Optional: add comments
                req.setComments('Processed via Donor Response Flow');

                // Process approval
                Approval.ProcessResult result = Approval.process(req);

                // Debug (optional)
                System.debug('Approval Result: ' + result);

            } catch (Exception e) {
                System.debug('Error processing approval: ' + e.getMessage());
            }
        }
    }
}