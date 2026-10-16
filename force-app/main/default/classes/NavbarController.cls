public without sharing class NavbarController {

    @AuraEnabled(cacheable=true)
    public static String getUserName() {
        String name = UserInfo.getName();
        if (String.isNotBlank(name) && !name.equalsIgnoreCase('Guest User')) {
            return name;
        }
        try {
            return [
                SELECT Name 
                FROM User 
                WHERE Id = :UserInfo.getUserId()
            ].Name;
        } catch (Exception e) {
            String first = UserInfo.getFirstName();
            String last = UserInfo.getLastName();
            return (String.isNotBlank(first) ? first + ' ' : '') + (String.isNotBlank(last) ? last : '');
        }
    }
}