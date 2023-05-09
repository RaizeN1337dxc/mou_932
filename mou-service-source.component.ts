import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {BasicDescriptionComponent} from "../registration/basic-description/basic-description.component";
import {ServiceProviderComponent} from "../registration/service-provider/service-provider.component";
import {ActualizationCodeListComponent} from "../registration/actualization-code-list/actualization-code-list.component";
import {ProcessedDataDescriptionComponent} from "../registration/processed-data-description/processed-data-description.component";
import {FormErrors, InputValidationError, RegistrationComponentEnum, RegistrationModel, ServiceError} from "../../common/model";
import {IdskService} from "@core/service/idsk/idsk.service";
import {RegistrationService} from "../../common/service/service-registry.service";
import {IFormGroup} from "@rxweb/types";
import {FormArray, FormGroup, ValidationErrors} from "@angular/forms";
import {Router} from '@angular/router';

@Component({
  selector: 'mou-service-source',
  templateUrl: './mou-service-source.component.html',
  styleUrls: ['./mou-service-source.component.sass']
})
export class MouServiceSourceComponent implements OnInit {

  @ViewChild(BasicDescriptionComponent)
  basicDescriptionComponent!: BasicDescriptionComponent;

  @ViewChild(ServiceProviderComponent)
  serviceProviderComponent!: ServiceProviderComponent;

  @ViewChild(ActualizationCodeListComponent)
  actualizationCodeListComponent!: ActualizationCodeListComponent;

  @ViewChild(ProcessedDataDescriptionComponent)
  processedDataDescComponent!: ProcessedDataDescriptionComponent;


  basicDescrValid: boolean = true;
  processedDataDescValid: boolean = true;
  serviceProviderValid: boolean = true;
  actualizationValid: boolean = true;
  formsAreValid: boolean = true;
  formErrors: InputValidationError[] = [];
  registrationError: ServiceError | undefined = undefined;

  constructor(
    private idsk: IdskService,
    private registryService: RegistrationService,
    private el: ElementRef,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    window.sessionStorage.removeItem("registration-section-accordion-source-content-1");
    window.sessionStorage.removeItem("registration-section-accordion-source-content-2");
    window.sessionStorage.removeItem("registration-section-accordion-source-content-3");
    window.sessionStorage.removeItem("registration-section-accordion-source-content-4");
    this.idsk.init();

  }


  public registry() {
    this.registrationError = undefined;

    this.validateComponents();

    if (!this.formsAreValid) {
      this.formErrors = [];
      this.getFormValidationErrors(this.basicDescriptionComponent.basicDescFormGroup, RegistrationComponentEnum.BASIC_DESCRIPTION_COMP);
      this.getFormValidationErrors(this.serviceProviderComponent.serviceProvFormGroup, RegistrationComponentEnum.SERVICE_PROVIDER_COMP);
      this.getFormValidationErrors(this.processedDataDescComponent.processedDataDescFormGroup, RegistrationComponentEnum.PROCESSED_DATA_DESCRIPTION_COMP);
      if (this.actualizationCodeListComponent.actualizationUndefined) {
        this.formErrors.push({
          component: RegistrationComponentEnum.ACTUALIZATION_FREQUENCIES_COMP,
          controlName: 'actualizationFrequencies',
          errorName: FormErrors.REQUIRED_ERROR,
          errorValue: true
        });
      }

      window.scroll(0, 0);

      return;
    }

    this.registryService.registryServiceDescription(this.buildRegistrationModel())
      .subscribe({
        next: (data) => {
          {
            console.log(data);
          }
        },
        error: (e) => {
          this.registrationError = e;
          window.scroll(0, 0);
        },
        complete: () => {
          console.log('Servis source bol vytvorený.');
          this.router.navigateByUrl('/mou-services');
        },
      });
  }


  public validateComponents() {

    this.basicDescriptionComponent.validateForm();
    this.serviceProviderComponent.validateForm();
    this.actualizationCodeListComponent.validateForm();
    this.processedDataDescComponent.validateForm();


    this.basicDescrValid = this.basicDescriptionComponent.basicDescFormGroup.valid;
    this.processedDataDescValid = this.processedDataDescComponent.processedDataDescFormGroup.valid;
    this.serviceProviderValid = this.serviceProviderComponent.serviceProvFormGroup.valid;
    this.actualizationValid = !this.actualizationCodeListComponent.actualizationUndefined;


    this.formsAreValid = this.basicDescrValid && this.serviceProviderValid
      && this.actualizationValid && this.processedDataDescValid;

  }


  public buildRegistrationModel(): RegistrationModel {
    return {
      basicDescription: this.basicDescriptionComponent.getModelData(),
      serviceProvider: this.serviceProviderComponent.getModelData(),
      servicePurpose: null,
      actualizationFrequencies: this.actualizationCodeListComponent.getModelData(),
      processedDataDescription: this.processedDataDescComponent.getModelData(),
      dataSources: null
    };
  }

  getFormValidationErrors(formGroup: IFormGroup<any>, componentName: string) {
    this.calculateErrors(formGroup, componentName);
  }

  toErrorSummary() {
    const errorSummaryAlert: HTMLElement = this.el.nativeElement.getElementById("error-summary-alert")
    window.scroll({
      top: this.getTopOffset(errorSummaryAlert),
      left: 0,
      behavior: "smooth"
    });
  }


  private getTopOffset(controlEl: HTMLElement): number {
    const labelOffset = 50;
    return controlEl.getBoundingClientRect().top + window.scrollY - labelOffset;
  }


  calculateErrors(form: FormGroup | FormArray, componentName: string) {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.formErrors = this.formErrors.concat(this.calculateErrors(control, componentName));
        return;
      }

      const controlErrors = control?.errors as ValidationErrors;

      if (controlErrors !== null) {
        Object.keys(controlErrors).forEach(keyError => {
          this.formErrors.push({
            component: componentName,
            controlName: key,
            errorName: keyError,
            errorValue: controlErrors[keyError]
          });
        });
      }
    });

    this.formErrors = this.formErrors.filter((error, index, self) => self.findIndex(t => {
      return t.controlName === error.controlName && t.errorName === error.errorName;
    }) === index);
    return this.formErrors;
  }

  onErrorClick(controlName: string) {
    const element = document.getElementById(controlName);
    if (element) {
      element.focus();
      element.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
    }
  }
}
