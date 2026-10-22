public without sharing class LeadTriggerHandler {
    public static void handleAfterUpdate(List<Lead> newList, Map<Id, Lead> oldMap) {
        List<Donor__c> donorsToInsert = new List<Donor__c>();
        List<Donor__c> donorsToUpdate = new List<Donor__c>();
        Set<String> emails = new Set<String>();
        Set<Id> convertedContactIds = new Set<Id>();

        for (Lead l : newList) {
            Lead oldL = oldMap != null ? oldMap.get(l.Id) : null;
            if (l.IsConverted && (oldL == null || !oldL.IsConverted)) {
                if (String.isNotBlank(l.Email)) {
                    emails.add(l.Email.toLowerCase());
                }
                if (l.ConvertedContactId != null) {
                    convertedContactIds.add(l.ConvertedContactId);
                }
            }
        }

        if (convertedContactIds.isEmpty()) return;

        // Check for existing donors to avoid duplicates
        Map<String, Donor__c> existingByEmail = new Map<String, Donor__c>();
        Map<Id, Donor__c> existingByContact = new Map<Id, Donor__c>();

        for (Donor__c d : [
            SELECT Id, Email__c, Contact__c, User__c 
            FROM Donor__c 
            WHERE (Email__c IN :emails AND Email__c != null) 
               OR (Contact__c IN :convertedContactIds AND Contact__c != null)
        ]) {
            if (String.isNotBlank(d.Email__c)) {
                existingByEmail.put(d.Email__c.toLowerCase(), d);
            }
            if (d.Contact__c != null) {
                existingByContact.put(d.Contact__c, d);
            }
        }

        // Map converted contact Id -> Donor Id to pass to future provisioning
        Map<Id, Id> contactToDonorMap = new Map<Id, Id>();
        Set<String> processedInBatch = new Set<String>();

        for (Lead l : newList) {
            Lead oldL = oldMap != null ? oldMap.get(l.Id) : null;
            if (l.IsConverted && (oldL == null || !oldL.IsConverted)) {
                String emailKey = String.isNotBlank(l.Email) ? l.Email.toLowerCase() : null;
                
                Donor__c existingDonor = null;
                if (l.ConvertedContactId != null && existingByContact.containsKey(l.ConvertedContactId)) {
                    existingDonor = existingByContact.get(l.ConvertedContactId);
                } else if (emailKey != null && existingByEmail.containsKey(emailKey)) {
                    existingDonor = existingByEmail.get(emailKey);
                }

                if (existingDonor != null) {
                    contactToDonorMap.put(l.ConvertedContactId, existingDonor.Id);
                    if (existingDonor.Contact__c == null && l.ConvertedContactId != null) {
                        existingDonor.Contact__c = l.ConvertedContactId;
                        donorsToUpdate.add(existingDonor);
                    }
                    continue;
                }

                if (emailKey != null && processedInBatch.contains(emailKey)) {
                    continue;
                }
                if (emailKey != null) {
                    processedInBatch.add(emailKey);
                }

                Donor__c d = new Donor__c();
                String fullName = (String.isNotBlank(l.FirstName) ? l.FirstName + ' ' : '') + 
                                  (String.isNotBlank(l.LastName) ? l.LastName : '');
                if (String.isBlank(fullName)) fullName = 'Philanthropic Donor';

                d.Donor_Name__c = String.isNotBlank(l.Company) && l.Company != 'Individual Philanthropist' 
                                  ? (l.Company + ' - ' + fullName) 
                                  : fullName;
                d.Donor_Type__c = String.isNotBlank(l.Company) && l.Company != 'Individual Philanthropist' 
                                  ? 'Corporate' 
                                  : 'Individual';
                d.Email__c = l.Email;
                d.Contact_Number__c = l.Phone;
                d.Contact__c = l.ConvertedContactId;
                d.Status__c = 'Active';
                d.Compliance_Status__c = 'Pending';
                d.KYC_Verified__c = false;
                d.Preferred_Funding_Type__c = 'Mixed';

                // Format address if present
                List<String> addrParts = new List<String>();
                if (String.isNotBlank(l.Street)) addrParts.add(l.Street);
                if (String.isNotBlank(l.City)) addrParts.add(l.City);
                if (String.isNotBlank(l.State)) addrParts.add(l.State);
                if (String.isNotBlank(l.PostalCode)) addrParts.add(l.PostalCode);
                if (String.isNotBlank(l.Country)) addrParts.add(l.Country);
                if (!addrParts.isEmpty()) {
                    d.Address__c = String.join(addrParts, ', ');
                }

                donorsToInsert.add(d);
            }
        }

        if (!donorsToUpdate.isEmpty()) {
            update donorsToUpdate;
        }

        if (!donorsToInsert.isEmpty()) {
            insert donorsToInsert;
            for (Donor__c d : donorsToInsert) {
                if (d.Contact__c != null) {
                    contactToDonorMap.put(d.Contact__c, d.Id);
                }
            }
        }

        // Fire asynchronous provisioning of Community User and welcome/reset password email
        if (!contactToDonorMap.isEmpty() && !System.isFuture() && !System.isBatch()) {
            List<Id> cList = new List<Id>();
            List<Id> dList = new List<Id>();
            for (Id cId : contactToDonorMap.keySet()) {
                cList.add(cId);
                dList.add(contactToDonorMap.get(cId));
            }
            provisionCommunityUsers(cList, dList);
        }
    }

    /**
     * Future method to provision Community User with Donor profile and trigger welcome / password reset email
     */
    @future
    public static void provisionCommunityUsers(List<Id> contactIds, List<Id> donorIds) {
        if (contactIds == null || contactIds.isEmpty()) return;

        try {
            // Find Donor Community Profile (Profile: Donor)
            List<Profile> profs = [SELECT Id FROM Profile WHERE Name = 'Donor' LIMIT 1];
            if (profs.isEmpty()) {
                profs = [SELECT Id FROM Profile WHERE Name = 'Customer Community User' OR Name = 'Customer Community Login User' LIMIT 1];
            }
            if (profs.isEmpty()) return;
            Id donorProfileId = profs[0].Id;

            // Find an active System Administrator who has a UserRoleId to ensure Account ownership doesn't fail
            Id adminId = null;
            List<User> admins = [
                SELECT Id 
                FROM User 
                WHERE Profile.Name = 'System Administrator' 
                  AND IsActive = true 
                  AND UserRoleId != null 
                LIMIT 1
            ];
            if (!admins.isEmpty()) {
                adminId = admins[0].Id;
            }

            List<Contact> contacts = [
                SELECT Id, FirstName, LastName, Email, AccountId, Account.OwnerId, Account.Owner.UserRoleId 
                FROM Contact 
                WHERE Id IN :contactIds
            ];

            // Build map of ContactId -> Donor
            Map<Id, Donor__c> donorByContact = new Map<Id, Donor__c>();
            if (donorIds != null && !donorIds.isEmpty()) {
                for (Donor__c d : [SELECT Id, Contact__c, User__c FROM Donor__c WHERE Id IN :donorIds]) {
                    if (d.Contact__c != null) {
                        donorByContact.put(d.Contact__c, d);
                    }
                }
            }

            // Verify Account Owner has Role for portal user creation
            List<Account> accountsToUpdate = new List<Account>();
            for (Contact c : contacts) {
                if (c.AccountId != null && c.Account.Owner.UserRoleId == null && adminId != null) {
                    accountsToUpdate.add(new Account(Id = c.AccountId, OwnerId = adminId));
                }
            }
            if (!accountsToUpdate.isEmpty()) {
                update accountsToUpdate;
            }

            List<User> usersToInsert = new List<User>();
            Map<Id, Id> contactToExistingUserId = new Map<Id, Id>();

            for (Contact c : contacts) {
                if (String.isBlank(c.Email)) continue;

                // Check if user already exists for this ContactId
                List<User> existing = [SELECT Id, IsActive, Username FROM User WHERE ContactId = :c.Id LIMIT 1];
                if (!existing.isEmpty()) {
                    User eu = existing[0];
                    if (!eu.IsActive) {
                        eu.IsActive = true;
                        update eu;
                    }
                    try {
                        System.resetPassword(eu.Id, true);
                    } catch (Exception ex) {
                        System.debug(LoggingLevel.WARN, 'Could not reset password for existing user: ' + ex.getMessage());
                    }
                    contactToExistingUserId.put(c.Id, eu.Id);
                    continue;
                }

                // Determine unique username
                String candidateUsername = c.Email;
                List<User> uCheck = [SELECT Id FROM User WHERE Username = :candidateUsername LIMIT 1];
                if (!uCheck.isEmpty()) {
                    candidateUsername = c.Email + '.donor';
                    List<User> uCheck2 = [SELECT Id FROM User WHERE Username = :candidateUsername LIMIT 1];
                    if (!uCheck2.isEmpty()) {
                        candidateUsername = c.Email + '.' + System.currentTimeMillis();
                    }
                }

                String alias = (c.FirstName != null && c.FirstName.length() > 0 ? c.FirstName.substring(0, 1) : '') + 
                               (c.LastName != null && c.LastName.length() >= 4 ? c.LastName.substring(0, 4) : (c.LastName != null ? c.LastName : 'user'));
                if (alias.length() > 8) alias = alias.substring(0, 8);

                User u = new User(
                    ContactId = c.Id,
                    ProfileId = donorProfileId,
                    FirstName = c.FirstName,
                    LastName = String.isNotBlank(c.LastName) ? c.LastName : 'Donor',
                    Email = c.Email,
                    Username = candidateUsername,
                    Alias = alias.toLowerCase(),
                    CommunityNickname = (c.FirstName != null ? c.FirstName : 'Donor') + '_' + String.valueOf(Math.abs(Crypto.getRandomInteger())).substring(0, 5),
                    TimeZoneSidKey = 'America/New_York',
                    LocaleSidKey = 'en_US',
                    EmailEncodingKey = 'UTF-8',
                    LanguageLocaleKey = 'en_US'
                );
                usersToInsert.add(u);
            }

            if (!usersToInsert.isEmpty()) {
                Database.DMLOptions dlo = new Database.DMLOptions();
                dlo.EmailHeader.triggerUserEmail = true;
                Database.SaveResult[] srList = Database.insert(usersToInsert, dlo);

                for (Integer i = 0; i < srList.size(); i++) {
                    if (srList[i].isSuccess()) {
                        Id newUserId = srList[i].getId();
                        Id cId = usersToInsert[i].ContactId;
                        contactToExistingUserId.put(cId, newUserId);
                        try {
                            System.resetPassword(newUserId, true);
                        } catch (Exception ex) {
                            System.debug(LoggingLevel.WARN, 'Password reset notice error: ' + ex.getMessage());
                        }
                    } else {
                        for (Database.Error err : srList[i].getErrors()) {
                            System.debug(LoggingLevel.ERROR, 'User insert failed for ' + usersToInsert[i].Username + ': ' + err.getMessage());
                        }
                    }
                }
            }

            // Update Donor__c records with new User__c Id
            List<Donor__c> donorsToLink = new List<Donor__c>();
            for (Id cId : contactToExistingUserId.keySet()) {
                if (donorByContact.containsKey(cId)) {
                    Donor__c d = donorByContact.get(cId);
                    d.User__c = contactToExistingUserId.get(cId);
                    donorsToLink.add(d);
                }
            }
            if (!donorsToLink.isEmpty()) {
                update donorsToLink;
            }

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in provisionCommunityUsers: ' + e.getMessage() + '\n' + e.getStackTraceString());
        }
    }
}
