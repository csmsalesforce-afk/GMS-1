for(Schema.PicklistEntry pe : Grant_Program__c.Profile_Status__c.getDescribe().getPicklistValues()){
    System.debug('STATUS_ENTRY: ' + pe.getValue() + ' / ' + pe.getLabel() + ' active=' + pe.isActive());
}
