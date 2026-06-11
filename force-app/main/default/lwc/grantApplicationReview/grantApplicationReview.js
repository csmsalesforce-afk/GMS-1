import { LightningElement, api, wire, track } from 'lwc';
import getApplicationData from '@salesforce/apex/GrantApplicationReviewController.getApplicationData';

export default class GrantApplicationReview extends LightningElement {

    @api recordId;

    @track application = {};
    @track documents = [];
    @track history = [];
    @track profileName;

    decision;

    decisionOptions = [
        { label: 'Approve', value: 'Approve' },
        { label: 'Reject', value: 'Reject' }
    ];

    priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
    ];

    @wire(getApplicationData,{applicationId:'$recordId'})
    wiredData({data,error}){

        if(data){

            this.application = data.application;

            this.documents = data.documents.map(doc => {
                return {
                    ...doc,
                    downloadUrl: '/sfc/servlet.shepherd/document/download/' + doc.ContentDocumentId
                };
            });

            this.history = data.history;

            this.profileName = data.profile;
        }

        if(error){
            console.error(error);
        }
    }

    get isReviewer(){
        return this.profileName === 'Reviewer';
    }

    get isProgramOfficer(){
        return this.profileName === 'Program Officer';
    }

    get isFinance(){
        return this.profileName === 'Finance';
    }

    handleDecisionChange(event){
        this.decision = event.detail.value;
    }

    handleSubmit(){
        console.log('Submit clicked');
    }

}