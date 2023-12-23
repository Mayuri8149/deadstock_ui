import { Location } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { SnackbarService } from 'src/app/services/snackbar.service';

@Component({
	selector: 'app-user-add',
	templateUrl: './user-add.component.html',
	styleUrls: ['./user-add.component.css']
})
export class UserAddComponent implements OnInit, OnDestroy {
	private subscriptions: Subscription[] = [];
	url: String;
	user: any = {
		firstName: '',
		lastName: '',
		role: '',
		entity: '',
		email: '',
		phoneNumber: '',
		organizationId: '',
		affiliateId: '',
		departmentId: '',
		isStatus: false
	};
	loggedInUser;
	role;
	entity;
	admin: boolean = false;
	organization: boolean = false;
	superManager: boolean = false;
	affiliateManager: boolean = false;
	departmentError: boolean = true;
	subadmin: boolean = false;
	sysadmin: boolean = false;
	required: boolean = true;
	inst_id;
	departments=[];
	affiliates=[];
	authUserForm: FormGroup;
  noWhitespaceValidator: any;
	constructor(private _formBuilder: FormBuilder,
				private apiService: ApiService,
				public router: Router,
				private location: Location,
				public snackbarService: SnackbarService) { }

	ngOnInit() {
		this.loggedInUser = JSON.parse(sessionStorage.getItem('user'));
		this.role = this.loggedInUser.reference.role;
		this.entity = this.loggedInUser.reference.entity;
		if(this.role == 'manager' && this.entity == 'organization') {
			this.superManager = true;
		}
		if(this.role == 'manager' && this.entity == 'affiliate') {
			this.affiliateManager = true;
		}
		if ((this.role == 'sysadmin' && this.entity == 'system') || (this.role == 'subadmin' && this.entity == 'system')) {
			this.subadmin = true;
		}
		this.inst_id = this.loggedInUser.reference.organizationId;
		this.authUserForm = this._formBuilder.group({
			role: ['', Validators.required],
			roleName: [''],
			entity: [''],
			departmentId: [''],
			affiliateId: [''],
			firstName: ['', [Validators.required, Validators.pattern('^(?! )(?!.* $)[a-zA-Z ()-]+$')]],
			lastName: ['', [Validators.required, Validators.pattern('^(?! )(?!.* $)[a-zA-Z ()-]+$')]],
			email: ['', [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
			phoneNumber: [undefined, [Validators.required]],
		});
		this.getDepartments();
		this.getAffiliates(this.loggedInUser.reference.departmentId);
	}

	public hasError = (controlName: string, errorName: string) =>{
		return  this.authUserForm.controls[controlName].hasError(errorName);
	}

	
	addUser(userData) {
		if(userData.invalid) {
		}
		var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
		this.url = '/user/create';
		this.user.firstName = userData.value.firstName;
		this.user.lastName = userData.value.lastName;
		this.user.role =  userData.value.role;
		this.user.email =  userData.value.email;
		this.user.phoneNumber =  userData.value.phoneNumber;
		this.user.organizationId = this.inst_id;
		this.user.timeZone = timeZone
		this.user.createdBy = {
			firstName:this.loggedInUser.firstName,
			lastName:this.loggedInUser.lastName,
			email:this.loggedInUser.email
		};
		this.user.updatedBy = {
			firstName:this.loggedInUser.firstName,
			lastName:this.loggedInUser.lastName,
			email:this.loggedInUser.email
		};
		if(userData.value.affiliateId == "" && (this.superManager || this.affiliateManager)) {
			this.user.departmentId = this.loggedInUser.reference.departmentId;

		} else {
			this.user.departmentId = userData.value.departmentId;
		};
		if (this.subadmin) {
			this.user.entity = 'system';
		}
		if(this.affiliateManager) {
			this.user.entity = "affiliate";
		} else if(this.admin || this.superManager) {
			this.user.entity = "organization";
		} else {
			this.user.entity = this.entity;
		}
		if(this.user.role == "reviewer" || this.user.role == "certifier") {
			this.user.isStatus = this.user.isStatus;
		}
		if(userData.value.affiliateId == "" && this.affiliateManager) {
			this.user.affiliateId = this.loggedInUser.reference.affiliateId;
		} else {
			this.user.affiliateId = userData.value.affiliateId;
		};
		this.user.roleName = userData.value.roleName;
		this.subscriptions.push(this.apiService.post(this.url, this.user)
			.subscribe((response: any) => {
				if(response.success == true) {
					this.snackbarService.openSuccessBar("User added successfully", "User");
					this.router.navigate(['/users/userList']);
				}
			}));
	}

	userValidation(user) {
	}

	getDepartments() {
		this.url = "/department/list";
		var params = new HttpParams();
		params = params.append('organizationId', this.inst_id);
		params = params.append('skip', '0');
		params = params.append('limit', '50');

		this.subscriptions.push(this.apiService.get(this.url, params)
			.subscribe((response) => {
				if(response.success == true) {
					var activedepartments = [];
					var departmentsArray = response.data.result.departments.result;
					for(var i=0; i<departmentsArray.length; i++) {
						if(departmentsArray[i].isActive == true) {
							departmentsArray[i].status = "Active";
							activedepartments.push(departmentsArray[i]);
						} else {
							departmentsArray[i].status = "Inactive";
						}
 					}
					this.departments = activedepartments;
				}
			}));
	}

	getAffiliates(departmentId) {
		this.url = "/affiliate/list";
		var params = new HttpParams();
		params = params.append('organizationId', this.inst_id);
		params = params.append('pagesize','100');
		params = params.append('page', '1');
		if(departmentId !== "111111111111111111111111") {
			params = params.append('departmentId', departmentId);
		}

		this.subscriptions.push(this.apiService.get(this.url, params)
			.subscribe((response) => {
				if(response.success == true) {
					var activeaffiliates = [];
					var affiliatesArray = response.data.result.affiliates;
					for(var i=0; i<affiliatesArray.length; i++) {
						if(affiliatesArray[i].isActive == true) {
							affiliatesArray[i].status = "Active";
							activeaffiliates.push(affiliatesArray[i]);
						} else {
							affiliatesArray[i].status = "Inactive";
						}
 					}
					this.affiliates = activeaffiliates;
				}
			}));
	}

	roleChange(role, form) {
		if(role == "admin" || role == "certifier") {
			this.admin = true;
			this.required = false;
			if(form.value.role == 'admin' || form.value.role == 'certifier') {
				form.value.departmentId = "";
				form.value.affiliateId = "";
			}
			else if (role == 'subadmin') {
				this.admin = true;
				if(form.value.role == 'subadmin') {
					form.value.departmentId = "";
					form.value.affiliateId = "";
				}
			}	 
		} else {
			this.required = true;
			this.admin = false;
		}
	}

	typeChange(type, form) {
		if(type == "organization") {
			this.organization = true;
			if(form.value.entity == 'organization') {
				form.value.affiliateId = "";
			}
		} else {
			this.organization = false;
		}
	}

	departmentChange(departmentId) {
		this.getAffiliates(departmentId);
	}

	goBack() {
		this.location.back();
	}
	ngOnDestroy() {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
	};
}