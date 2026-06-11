import { LightningElement } from 'lwc';

export default class ReactRedirect extends LightningElement {
    connectedCallback() {
        window.location.replace("https://gms-eosin.vercel.app/");
    }
}