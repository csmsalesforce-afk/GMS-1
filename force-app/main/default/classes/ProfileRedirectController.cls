public with sharing class ProfileRedirectController {


public PageReference redirectUser(){

    User u = [
        SELECT Profile.Name
        FROM User
        WHERE Id = :UserInfo.getUserId()
    ];

    if(u.Profile.Name == 'System Administrator'){
        return new PageReference('/s/admin-dashboard');
    }

    if(u.Profile.Name == 'Reviewer'){
        return new PageReference('/s/homereviewer');
    }

    if(u.Profile.Name == 'Program Officer'){
        return new PageReference('/s/homePO');
    }

    if(u.Profile.Name == 'Finance'){
        return new PageReference('/s/homefinancer');
    }

    return new PageReference('/s/landingpage');
}


}