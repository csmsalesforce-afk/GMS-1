Id classId = [SELECT Id FROM ApexClass WHERE Name = 'DonorPortalController' LIMIT 1].Id;
Id permSetId = [SELECT Id FROM PermissionSet WHERE Profile.Name = 'Donor Management Profile' LIMIT 1].Id;

List<SetupEntityAccess> existing = [SELECT Id FROM SetupEntityAccess WHERE SetupEntityId = :classId AND ParentId = :permSetId];
if (existing.isEmpty()) {
    SetupEntityAccess sea = new SetupEntityAccess(
        ParentId = permSetId,
        SetupEntityId = classId
    );
    insert sea;
    System.debug('Successfully granted DonorPortalController access to Donor Management Guest Profile!');
} else {
    System.debug('Access already granted.');
}
