trigger GrantProgramTrigger on Grant_Program__c (after insert) {

    List<Grant_Program__c> updates = new List<Grant_Program__c>();

    for (Grant_Program__c gp : Trigger.new) {
        updates.add(new Grant_Program__c(
            Id = gp.Id,
            Pending_Account_Creation__c = true
        ));
    }

    if (!updates.isEmpty()) {
        update updates;
    }
}