import { LightningElement, wire, track } from 'lwc';
import USER_ID from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import CSM_LOGO from '@salesforce/resourceUrl/InvoiceLogo';

const fields = [
    'User.Name',
    'User.Profile.Name'
];

export default class GemsNavbarPo extends LightningElement {

    logoUrl = CSM_LOGO;

    @track userName = '';
    @track profileName = '';
    @track activeTab = 'dashboard';

    @track showProfileMenu = false;

    @wire(getRecord, { recordId: USER_ID, fields })
    userData({data,error}){

        if(data){
            this.userName = data.fields.Name.value;

            this.profileName =
                data.fields.Profile.displayValue ||
                data.fields.Profile.value.fields.Name.value;
        }

        if(error){
            console.error(error);
        }
    }

    get initials(){
        if(!this.userName) return '';

        const parts = this.userName.split(' ');
        if(parts.length > 1){
            return parts[0][0] + parts[1][0];
        }
        return parts[0][0];
    }

    get programClass(){
        return this.activeTab === 'programs'
            ? 'menu-item active'
            : 'menu-item';
    }

    // 🔥 MAIN FIX (ROLE BASED NAVIGATION)
    navigatePrograms(){

        this.activeTab = 'programs';

        let url = '';

        // Normalize profile name (avoid case issues)
        const profile = this.profileName?.toLowerCase();

        if(profile.includes('reviewer')){
            url = 'homereviewer';   // 👉 change if your page name differs
        }
        else if(profile.includes('program')){
            url = 'homePO';
        }
        else if(profile.includes('finance')){
            url = 'homefinancer';
        }
        else{
            // fallback (default grant programs page)
            url = '/s/';
        }

        window.location.href = url;
    }

    toggleProfileMenu(){
        this.showProfileMenu = !this.showProfileMenu;
    }

    logout(){
        const customLoginUrl = 'https://orgfarm-4e9caeff63-dev-ed.develop.my.site.com/gmsa/LoginCustom';
        window.location.href = '/gmsa/secur/logout.jsp?retUrl=' + encodeURIComponent(customLoginUrl);
    }
}