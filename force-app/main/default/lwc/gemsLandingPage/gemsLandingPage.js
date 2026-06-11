import { LightningElement } from 'lwc';

export default class GemsLandingPage extends LightningElement {

    handleApply() {
        window.location.href = '/grantmanagement/s/apply';
    }

    handleLogin() {
        window.location.href = '/grantmanagement/login';
    }

    handleTrack() {
        window.location.href = '/grantmanagement/s/my-applications';
    }
}