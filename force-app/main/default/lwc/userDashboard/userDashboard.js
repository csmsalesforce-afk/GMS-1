import { LightningElement, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';

const FIELDS = ['User.Name'];

export default class UserDashboard extends LightningElement {
    userName;
    count = 0;
    today = new Date().toLocaleDateString();

    @wire(getRecord, { recordId: USER_ID, fields: FIELDS })
    userHandler({ data, error }) {
        if (data) {
            this.userName = data.fields.Name.value;
        } else if (error) {
            console.error(error);
        }
    }

    increaseCount() {
        
        this.count++;
    }
}