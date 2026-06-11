public class AutoApprovalHelper {
    
    // Wrapper class to receive inputs from the Flow
    public class ApprovalInput {
        @InvocableVariable(label='Record ID' required=true)
        public Id recordId;
        
        @InvocableVariable(label='Action (Approve/Reject)' required=true)
        public String actionType; // Values must be 'Approve', 'Reject', or 'Remove'
        
        @InvocableVariable(label='Comments')
        public String comments;
    }

    @InvocableMethod(label='Process Approval Request' description='Auto-approves or rejects a pending record')
    public static void processApprovals(List<ApprovalInput> inputs) {
        List<Approval.ProcessWorkitemRequest> requests = new List<Approval.ProcessWorkitemRequest>();
        
        // 1. Collect all Record IDs
        Set<Id> targetIds = new Set<Id>();
        for (ApprovalInput inp : inputs) {
            targetIds.add(inp.recordId);
        }

        // 2. Find pending work items (ProcessInstanceWorkitem) for these records
        Map<Id, ProcessInstanceWorkitem> workItemMap = new Map<Id, ProcessInstanceWorkitem>();
        for (ProcessInstanceWorkitem p : [SELECT Id, ProcessInstance.TargetObjectId 
                                          FROM ProcessInstanceWorkitem 
                                          WHERE ProcessInstance.TargetObjectId IN :targetIds
                                          AND ProcessInstance.Status = 'Pending']) {
            workItemMap.put(p.ProcessInstance.TargetObjectId, p);
        }

        // 3. Prepare the approval requests
        for (ApprovalInput inp : inputs) {
            if (workItemMap.containsKey(inp.recordId)) {
                Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
                req.setWorkitemId(workItemMap.get(inp.recordId).Id);
                req.setAction(inp.actionType); 
                req.setComments(inp.comments);
                requests.add(req);
            }
        }

        // 4. Execute
        if (!requests.isEmpty()) {
            try {
                Approval.process(requests);
            } catch (Exception e) {
                System.debug('Error processing approvals: ' + e.getMessage());
            }
        }
    }
}