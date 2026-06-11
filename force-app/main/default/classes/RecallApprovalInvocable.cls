public class RecallApprovalInvocable {
    @InvocableMethod(label='Recall Approval')
    public static void recallApproval(List<Id> recordIds) {
        for (Id recordId : recordIds) {
            ProcessInstanceWorkitem wi = [
                SELECT Id
                FROM ProcessInstanceWorkitem
                WHERE ProcessInstance.TargetObjectId = :recordId
                LIMIT 1
            ];

            Approval.ProcessWorkitemRequest req =
                new Approval.ProcessWorkitemRequest();
            req.setWorkitemId(wi.Id);
            req.setAction('Removed');
            Approval.process(req);
        }
    }
}