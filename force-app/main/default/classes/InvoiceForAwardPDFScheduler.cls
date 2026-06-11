global class InvoiceForAwardPDFScheduler implements Schedulable {
    global void execute(SchedulableContext sc) {
        Database.executeBatch(new InvoiceForAwardPDFBatch(), 5);
    }
}