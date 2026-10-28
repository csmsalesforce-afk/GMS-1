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
            SELECT Id, Email__c, Contact__c, User__c, Program__c, Authorized_Campaigns__c 
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
                    Boolean needsUpdate = false;
                    if (existingDonor.Contact__c == null && l.ConvertedContactId != null) {
                        existingDonor.Contact__c = l.ConvertedContactId;
                        needsUpdate = true;
                    }
                    if (l.Program__c != null && existingDonor.Program__c == null) {
                        existingDonor.Program__c = l.Program__c;
                        needsUpdate = true;
                    }
                    if (l.Donor_Campaign__c != null) {
                        String campIdStr = String.valueOf(l.Donor_Campaign__c);
                        if (String.isBlank(existingDonor.Authorized_Campaigns__c)) {
                            existingDonor.Authorized_Campaigns__c = campIdStr;
                            needsUpdate = true;
                        } else if (!existingDonor.Authorized_Campaigns__c.contains(campIdStr)) {
                            existingDonor.Authorized_Campaigns__c += ',' + campIdStr;
                            needsUpdate = true;
                        }
                    }
                    if (needsUpdate) {
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
                d.Compliance_Status__c = 'Approved';
                d.KYC_Verified__c = true;
                d.Preferred_Funding_Type__c = 'Mixed';
                if (l.Program__c != null) {
                    d.Program__c = l.Program__c;
                }
                if (l.Donor_Campaign__c != null) {
                    d.Authorized_Campaigns__c = String.valueOf(l.Donor_Campaign__c);
                }

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

        // Map converted lead Id to Donor Id to copy attached files
        Map<Id, Id> leadToDonorMap = new Map<Id, Id>();
        for (Lead l : newList) {
            Lead oldL = oldMap != null ? oldMap.get(l.Id) : null;
            if (l.IsConverted && (oldL == null || !oldL.IsConverted)) {
                if (contactToDonorMap.containsKey(l.ConvertedContactId)) {
                    leadToDonorMap.put(l.Id, contactToDonorMap.get(l.ConvertedContactId));
                }
            }
        }

        if (!leadToDonorMap.isEmpty()) {
            List<ContentDocumentLink> leadFileLinks = [
                SELECT ContentDocumentId, LinkedEntityId 
                FROM ContentDocumentLink 
                WHERE LinkedEntityId IN :leadToDonorMap.keySet()
            ];
            if (!leadFileLinks.isEmpty()) {
                List<ContentDocumentLink> newDonorLinks = new List<ContentDocumentLink>();
                for (ContentDocumentLink cdl : leadFileLinks) {
                    Id dId = leadToDonorMap.get(cdl.LinkedEntityId);
                    if (dId != null) {
                        newDonorLinks.add(new ContentDocumentLink(
                            ContentDocumentId = cdl.ContentDocumentId,
                            LinkedEntityId = dId,
                            ShareType = 'V',
                            Visibility = 'AllUsers'
                        ));
                    }
                }
                if (!newDonorLinks.isEmpty()) {
                    Database.insert(newDonorLinks, false);
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

            // Resolve dynamic login URL for the Donor Experience site
            String donorLoginUrl = 'https://orgfarm-4e9caeff63-dev-ed.develop.my.site.com/donor';
            try {
                List<Network> donorNets = [SELECT Id FROM Network WHERE UrlPathPrefix = 'donor' OR Name = 'Donor Management' LIMIT 1];
                if (!donorNets.isEmpty()) {
                    String netUrl = Network.getLoginUrl(donorNets[0].Id);
                    if (String.isNotBlank(netUrl)) {
                        donorLoginUrl = netUrl;
                    }
                }
            } catch (Exception ex) {
                System.debug(LoggingLevel.WARN, 'Could not query Network login url: ' + ex.getMessage());
            }

            List<User> usersToInsert = new List<User>();
            Map<Id, Id> contactToExistingUserId = new Map<Id, Id>();

            for (Contact c : contacts) {
                if (String.isBlank(c.Email)) continue;

                // Check if user already exists for this ContactId
                List<User> existing = [SELECT Id, IsActive, Username, Email, FirstName, LastName FROM User WHERE ContactId = :c.Id LIMIT 1];
                if (!existing.isEmpty()) {
                    User eu = existing[0];
                    if (!eu.IsActive) {
                        eu.IsActive = true;
                        update eu;
                    }
                    String initialPwd = '';
                    try {
                        Integer rand = 1000 + Math.abs(Math.mod(Crypto.getRandomInteger(), 9000));
                        initialPwd = 'Donor@' + rand + '!';
                        System.setPassword(eu.Id, initialPwd);
                    } catch (Exception ex) {
                        System.debug(LoggingLevel.WARN, 'Could not set password for existing user: ' + ex.getMessage());
                    }
                    contactToExistingUserId.put(c.Id, eu.Id);
                    sendBrandedWelcomeEmail(c.Email, c.FirstName, eu.Username, initialPwd, donorLoginUrl);
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
                // Suppress raw system emails from wrong/generic sites
                dlo.EmailHeader.triggerUserEmail = false;
                Database.SaveResult[] srList = Database.insert(usersToInsert, dlo);

                for (Integer i = 0; i < srList.size(); i++) {
                    if (srList[i].isSuccess()) {
                        Id newUserId = srList[i].getId();
                        Id cId = usersToInsert[i].ContactId;
                        contactToExistingUserId.put(cId, newUserId);
                        
                        String initialPassword = '';
                        try {
                            // Set an active, fully functional initial password that allows instant login
                            Integer rand = 1000 + Math.abs(Math.mod(Crypto.getRandomInteger(), 9000));
                            initialPassword = 'Donor@' + rand + '!';
                            System.setPassword(newUserId, initialPassword);
                        } catch (Exception ex) {
                            System.debug(LoggingLevel.WARN, 'Password set error: ' + ex.getMessage());
                        }

                        // Send single, high-quality branded HTML welcome email
                        sendBrandedWelcomeEmail(
                            usersToInsert[i].Email,
                            usersToInsert[i].FirstName,
                            usersToInsert[i].Username,
                            initialPassword,
                            donorLoginUrl
                        );
                    } else {
                        for (Database.Error err : srList[i].getErrors()) {
                            System.debug(LoggingLevel.ERROR, 'User insert failed for ' + usersToInsert[i].Username + ': ' + err.getMessage());
                        }
                    }
                }
            }

            // Update Donor__c records with new User__c Id and Approved verification status
            List<Donor__c> donorsToLink = new List<Donor__c>();
            for (Id cId : contactToExistingUserId.keySet()) {
                if (donorByContact.containsKey(cId)) {
                    Donor__c d = donorByContact.get(cId);
                    d.User__c = contactToExistingUserId.get(cId);
                    d.Status__c = 'Active';
                    d.Compliance_Status__c = 'Approved';
                    d.KYC_Verified__c = true;
                    donorsToLink.add(d);
                }
            }
            if (!donorsToLink.isEmpty()) {
                update donorsToLink;
            }

            // Automatically assign Donor_Management_Access permission set to provisioned users
            List<PermissionSet> permSets = [SELECT Id FROM PermissionSet WHERE Name = 'Donor_Management_Access' LIMIT 1];
            if (!permSets.isEmpty() && !contactToExistingUserId.isEmpty()) {
                Id permSetId = permSets[0].Id;
                Set<Id> userIdsToAssign = new Set<Id>(contactToExistingUserId.values());
                Set<Id> alreadyAssigned = new Set<Id>();
                for (PermissionSetAssignment psa : [
                    SELECT AssigneeId 
                    FROM PermissionSetAssignment 
                    WHERE PermissionSetId = :permSetId AND AssigneeId IN :userIdsToAssign
                ]) {
                    alreadyAssigned.add(psa.AssigneeId);
                }
                List<PermissionSetAssignment> psasToInsert = new List<PermissionSetAssignment>();
                for (Id uId : userIdsToAssign) {
                    if (!alreadyAssigned.contains(uId)) {
                        psasToInsert.add(new PermissionSetAssignment(
                            AssigneeId = uId,
                            PermissionSetId = permSetId
                        ));
                    }
                }
                if (!psasToInsert.isEmpty()) {
                    Database.insert(psasToInsert, false);
                }
            }

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Error in provisionCommunityUsers: ' + e.getMessage() + '\n' + e.getStackTraceString());
        }
    }

    /**
     * Sends a modern branded HTML welcome email with credentials and direct access button
     */
    @TestVisible
    public static void sendBrandedWelcomeEmail(String recipientEmail, String recipientName, String username, String tempPassword, String loginUrl) {
        if (String.isBlank(recipientEmail)) return;

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new List<String>{ recipientEmail });
        mail.setSubject('Welcome to GMS Donor Portal – Complete Your Account Access');
        
        // Use verified Org-Wide Email Address for reliable inbox delivery
        List<OrgWideEmailAddress> oweas = [SELECT Id FROM OrgWideEmailAddress WHERE Address = 'csmsalesforce@gmail.com' LIMIT 1];
        if (oweas.isEmpty()) {
            oweas = [SELECT Id FROM OrgWideEmailAddress LIMIT 1];
        }
        if (!oweas.isEmpty()) {
            mail.setOrgWideEmailAddressId(oweas[0].Id);
        } else {
            mail.setSenderDisplayName('GMS Philanthropy Portal');
        }
        mail.setSaveAsActivity(false);

        String greeting = String.isNotBlank(recipientName) ? 'Hi ' + recipientName + ',' : 'Hello,';
        String safeUsername = String.isNotBlank(username) ? username : recipientEmail;
        String safePassword = String.isNotBlank(tempPassword) ? tempPassword : '(Generated upon first login)';
        String safeLoginUrl = String.isNotBlank(loginUrl) ? loginUrl : 'https://orgfarm-4e9caeff63-dev-ed.develop.my.site.com/donor';

        String htmlBody = '<!DOCTYPE html>' +
            '<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
            '<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">' +
            '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0f172a;">' +
            '<tr><td align="center" style="padding: 40px 16px;">' +
            '  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); border: 1px solid #334155;">' +
            '    <!-- Header -->' +
            '    <tr><td style="background: linear-gradient(135deg, #022c22 0%, #064e3b 40%, #065f46 100%); padding: 42px 36px; text-align: center;">' +
            '      <div style="display: inline-block; background: rgba(255, 255, 255, 0.12); border-radius: 9999px; padding: 6px 16px; margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.2);">' +
            '        <span style="color: #6ee7b7; font-weight: 700; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">✦ Global Impact & Philanthropy</span>' +
            '      </div>' +
            '      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">Welcome to GMS Donor Portal</h1>' +
            '      <p style="margin: 10px 0 0 0; color: #a7f3d0; font-size: 14px; font-weight: 400;">Your dedicated platform for tracking real-time humanitarian impact</p>' +
            '    </td></tr>' +
            '    <!-- Content -->' +
            '    <tr><td style="padding: 36px 36px 28px 36px;">' +
            '      <p style="font-size: 17px; line-height: 26px; margin: 0 0 14px 0; color: #0f172a; font-weight: 600;">' + greeting + '</p>' +
            '      <p style="font-size: 15px; line-height: 24px; margin: 0 0 24px 0; color: #475569;">' +
            '        Your personalized donor account is active. You now have secure access to view live campaign funding progress, review project milestones, access donation receipts, and manage your recurring contributions.' +
            '      </p>' +
            '      <!-- Credentials Card -->' +
            '      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; margin-bottom: 28px;">' +
            '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 14px;">Your Access Credentials</div>' +
            '        <div style="margin-bottom: 12px;">' +
            '          <span style="font-size: 13px; color: #64748b; display: inline-block; width: 130px;">Username:</span>' +
            '          <strong style="font-size: 14px; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">' + safeUsername + '</strong>' +
            '        </div>' +
            '        <div>' +
            '          <span style="font-size: 13px; color: #64748b; display: inline-block; width: 130px;">Initial Password:</span>' +
            '          <strong style="font-size: 14px; color: #047857; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">' + safePassword + '</strong>' +
            '        </div>' +
            '      </div>' +
            '      <!-- Action Button -->' +
            '      <div style="text-align: center; margin: 34px 0 28px 0;">' +
            '        <a href="' + safeLoginUrl + '" target="_blank" style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 10px 20px -5px rgba(5, 150, 105, 0.4); letter-spacing: 0.01em;">' +
            '          Sign In to Donor Portal →' +
            '        </a>' +
            '      </div>' +
            '      <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 0 0 20px 0; text-align: center;">' +
            '        Sign in directly using your initial password above. You can update your password anytime under your profile settings.' +
            '      </p>' +
            '      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px;">' +
            '        <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0;">' +
            '          🔒 <strong>Security Tip:</strong> Never share your login credentials with anyone. If you have questions, please reach out to our team.' +
            '        </p>' +
            '      </div>' +
            '    </td></tr>' +
            '    <!-- Footer -->' +
            '    <tr><td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center;">' +
            '      <p style="font-size: 12px; color: #64748b; margin: 0 0 4px 0; font-weight: 500;">Grant Management System (GMS) • Philanthropic Network</p>' +
            '      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Need help? Contact donor support at support@gms.org</p>' +
            '    </td></tr>' +
            '  </table>' +
            '</td></tr></table></body></html>';

        mail.setHtmlBody(htmlBody);

        String plainText = greeting + '\n\n' +
            'Welcome to the GMS Donor Portal!\n\n' +
            'Your account has been created. Here are your credentials:\n' +
            'Username: ' + safeUsername + '\n' +
            'Initial Password: ' + safePassword + '\n\n' +
            'Access the portal and sign in here:\n' +
            safeLoginUrl + '\n\n' +
            'Thanks,\nGMS Philanthropy Team';

        mail.setPlainTextBody(plainText);

        try {
            Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
            System.debug('Branded welcome email sent successfully to: ' + recipientEmail);
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Failed to send branded welcome email: ' + ex.getMessage());
        }
    }
}
