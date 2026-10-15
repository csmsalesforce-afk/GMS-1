public without sharing class UserResolver {
    public static Map<Id, String> getUserFullNames(Set<Id> userIds) {
        Map<Id, String> result = new Map<Id, String>();
        if (userIds == null || userIds.isEmpty()) {
            return result;
        }
        for (User u : [SELECT Id, Name, FirstName, LastName FROM User WHERE Id IN :userIds]) {
            String fullName = '';
            if (String.isNotBlank(u.FirstName)) {
                fullName += u.FirstName.trim() + ' ';
            }
            if (String.isNotBlank(u.LastName)) {
                fullName += u.LastName.trim();
            }
            if (String.isBlank(fullName)) {
                fullName = u.Name;
            }
            result.put(u.Id, fullName.trim());
        }
        return result;
    }
}
