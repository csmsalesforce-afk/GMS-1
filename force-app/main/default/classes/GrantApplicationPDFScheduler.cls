global class GrantApplicationPDFScheduler implements Schedulable {

    global void execute(SchedulableContext sc) {
        Database.executeBatch(new GrantApplicationPDFBatch(), 10);
    }
}