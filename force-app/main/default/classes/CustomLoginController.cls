/**

* Custom controller to handle Login, Registration, and Forgot Password
* For Salesforce Experience Cloud
  */

global with sharing class CustomLoginController {


// LOGIN FIELDS
global String username { get; set; }
global String password { get; set; }

// REGISTRATION FIELDS
public String firstName { get; set; }
public String lastName  { get; set; }
public String email     { get; set; }
public String confirmPassword { get; set; }

// CONSTRUCTOR
global CustomLoginController() {}



// =========================================================
// 1. LOGIN
// =========================================================
global PageReference login() {

    try {

        // Login first and redirect to Visualforce redirect page
        PageReference result = Site.login(username, password, '/apex/profileRedirect');

        if(result != null){
            result.setRedirect(true);
        }

        return result;

    } catch (Exception e) {

        ApexPages.addMessage(
            new ApexPages.Message(
                ApexPages.Severity.ERROR,
                e.getMessage()
            )
        );

        return null;
    }
}



// =========================================================
// 2. FORGOT PASSWORD
// =========================================================
public PageReference forgotPassword() {

    try {

        Boolean success = Site.forgotPassword(username);

        if (success) {

            ApexPages.addMessage(
                new ApexPages.Message(
                    ApexPages.Severity.CONFIRM,
                    'Password reset email has been sent.'
                )
            );

        } else {

            ApexPages.addMessage(
                new ApexPages.Message(
                    ApexPages.Severity.ERROR,
                    'Unable to process password reset.'
                )
            );

        }

    } catch (Exception e) {

        ApexPages.addMessage(
            new ApexPages.Message(
                ApexPages.Severity.ERROR,
                e.getMessage()
            )
        );

    }

    return null;
}



// =========================================================
// 3. REGISTRATION
// =========================================================
public PageReference register() {

    if (UserInfo.getUserType() != 'Guest') {

        ApexPages.addMessage(
            new ApexPages.Message(
                ApexPages.Severity.ERROR,
                'You are already logged in. Please log out to create a new account.'
            )
        );

        return null;
    }

    try {

        username = email;

        if (String.isBlank(firstName) ||
            String.isBlank(lastName) ||
            String.isBlank(email) ||
            String.isBlank(password) ||
            String.isBlank(confirmPassword)) {

            ApexPages.addMessage(
                new ApexPages.Message(
                    ApexPages.Severity.ERROR,
                    'All required fields must be filled.'
                )
            );

            return null;
        }

        if (password != confirmPassword) {

            ApexPages.addMessage(
                new ApexPages.Message(
                    ApexPages.Severity.ERROR,
                    'Passwords do not match.'
                )
            );

            return null;
        }

        Profile applicantProfile = [
            SELECT Id
            FROM Profile
            WHERE Name = 'Applicant Demo'
            LIMIT 1
        ];

        User u = new User();

        u.Username = username;
        u.Email = email;
        u.FirstName = firstName;
        u.LastName = lastName;
        

        u.Alias = (firstName.left(1) + lastName.left(4)).left(8);

        u.CommunityNickname =
            firstName + lastName + Math.abs(Crypto.getRandomInteger());

        u.TimeZoneSidKey = 'Asia/Kolkata';
        u.LocaleSidKey = 'en_US';
        u.EmailEncodingKey = 'UTF-8';
        u.LanguageLocaleKey = 'en_US';

        String accountId = null;

        String userId = Site.createExternalUser(u, accountId, password);

        if (userId != null) {

            // Auto login after registration
            return Site.login(username, password, '/apex/profileRedirect');

        }

    } catch (Exception e) {

        ApexPages.addMessage(
            new ApexPages.Message(
                ApexPages.Severity.ERROR,
                e.getMessage()
            )
        );

    }

    return null;
}



// =========================================================
// NAVIGATION
// =========================================================

public PageReference forwardToRegister() {
    return new PageReference('/CustomRegisterPage');
}

public PageReference forwardToForgot() {
    return new PageReference('/CustomForgotPage');
}

public PageReference forwardToLogin() {
    return new PageReference('/LoginCustom');
}


}