/**
 * Custom controller to handle Donor Login, Registration, and Password Reset
 * Integrates with Salesforce Experience Cloud and uses the 'Donor' Profile
 */
global without sharing class DonorLoginController {

    // LOGIN FIELDS
    global String username { get; set; }
    global String password { get; set; }

    // REGISTRATION FIELDS
    public String firstName { get; set; }
    public String lastName  { get; set; }
    public String email     { get; set; }
    public String confirmPassword { get; set; }

    // FORM MODE: 'login' | 'register'
    public String mode { get; set; }

    // CONSTRUCTOR
    global DonorLoginController() {
        String m = ApexPages.currentPage().getParameters().get('mode');
        if (String.isNotBlank(m)) {
            mode = m;
        } else {
            mode = 'login';
        }
    }

    // =========================================================
    // 1. LOGIN
    // =========================================================
    global PageReference login() {
        try {
            if (String.isBlank(username)) {
                ApexPages.addMessage(
                    new ApexPages.Message(
                        ApexPages.Severity.ERROR,
                        'Enter a value in the Email Address field.'
                    )
                );
                return null;
            }
            if (String.isBlank(password)) {
                ApexPages.addMessage(
                    new ApexPages.Message(
                        ApexPages.Severity.ERROR,
                        'Enter a value in the Password field.'
                    )
                );
                return null;
            }

            String startUrl = ApexPages.currentPage().getParameters().get('startURL');
            if (String.isBlank(startUrl)) {
                startUrl = '/donor/s/#dashboard';
            }

            // Redirect to the donor site home upon successful login
            PageReference result = Site.login(username, password, startUrl);

            if (result != null) {
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
    // 3. NAVIGATION LINKS
    // =========================================================
    public PageReference forwardToForgot() {
        PageReference pr = Page.CustomForgotPage;
        pr.setRedirect(true);
        return pr;
    }

    public PageReference forwardToRegister() {
        // Redirect to Donor registration experience page
        PageReference pr = new PageReference('/donor/s/');
        pr.setRedirect(true);
        return pr;
    }

    // =========================================================
    // 4. DONOR USER REGISTRATION (Profile: 'Donor')
    // =========================================================
    public PageReference registerDonorUser() {
        mode = 'register';

        if (UserInfo.getUserType() != 'Guest') {
            ApexPages.addMessage(
                new ApexPages.Message(
                    ApexPages.Severity.ERROR,
                    'You are already logged in. Please log out to register a new account.'
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

            User u = new User();
            u.Username = username;
            u.Email = email;
            u.FirstName = firstName;
            u.LastName = lastName;
            u.Alias = (firstName.left(1) + lastName.left(4)).left(8);
            u.CommunityNickname = firstName + lastName + Math.abs(Crypto.getRandomInteger());
            u.TimeZoneSidKey = 'Asia/Kolkata';
            u.LocaleSidKey = 'en_US';
            u.EmailEncodingKey = 'UTF-8';
            u.LanguageLocaleKey = 'en_US';
            // Note: In Experience Cloud, Site.createExternalUser automatically assigns the
            // SelfRegProfileId configured on the Donor network ('Donor' Profile).
            // Do NOT set u.ProfileId here, as that causes "Field is not writeable: User.ProfileId".

            String accountId = null;
            String userId = Site.createExternalUser(u, accountId, password);

            if (userId != null) {
                // Auto-login to donor site dashboard as requested
                PageReference autoLogin = Site.login(username, password, '/donor/s/#dashboard');
                if (autoLogin != null) {
                    autoLogin.setRedirect(true);
                    return autoLogin;
                }

                PageReference loginPage = Page.DonorCustomLogin;
                loginPage.getParameters().put('mode', 'login');
                loginPage.getParameters().put('registered', 'true');
                loginPage.setRedirect(true);
                return loginPage;
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
}
