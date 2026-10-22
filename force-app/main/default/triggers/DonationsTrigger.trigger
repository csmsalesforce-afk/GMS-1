trigger DonationsTrigger on Donations__c (after insert, after update) {
    if (Trigger.isAfter) {
        if (Trigger.isInsert) {
            DonationsTriggerHandler.handleAfterInsert(Trigger.new);
        } else if (Trigger.isUpdate) {
            DonationsTriggerHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
        }
    }
}
