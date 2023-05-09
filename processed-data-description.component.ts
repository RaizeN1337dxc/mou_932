import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators} from '@angular/forms';
import {IFormBuilder, IFormGroup} from '@rxweb/types';
import {spaceGutter} from '@shared/utils/component.utils';
import {urlify} from '@shared/utils/url.utils';
import {
  CodeItemModel,
  CodeListModel,
  DatasetModel,
  DescriptionModel,
  FormErrors,
  PreferredLanguage,
  ProcessedDataDescriptionModelView
} from '../../../common/model';
import {RegistrationCodeListService} from "../../../common/service/registration-code-list.service";
import {CustomValidators} from '@shared/validator/custom-validators';
import {createCodeListModelFromCodeList} from "@shared/utils/codelist.utils";


@Component({
  selector: 'mou-processed-data-description',
  templateUrl: './processed-data-description.component.html',
  styleUrls: ['./processed-data-description.component.sass']
})
export class ProcessedDataDescriptionComponent implements OnInit {

  processedDataDescFormGroup!: IFormGroup<ProcessedDataDescriptionModelView>;

  private formBuilder: IFormBuilder;
  public categories: CodeListModel = {codeItems: []};
  categoryOptions: Map<number, CodeItemModel[]> = new Map<number, CodeItemModel[]>();

  datasets!: FormArray;
  keywords!: FormArray;
  descriptions!: FormArray;

  activeTabIndex = 0;


  constructor(formBuilder: FormBuilder,
              private registrationCodeListService: RegistrationCodeListService) {
    this.formBuilder = formBuilder;
    this.initForm();
  }

  ngOnInit(): void {

    this.registrationCodeListService.getCategoryList()
      .then(data => {
          this.categories = createCodeListModelFromCodeList(data);
          console.log('Čiselník CategoryService bol úspešne dotiahnutý.');
        }
      ).catch(e => {
      console.log('Chyba: Čiselník CategoryService nebolo možné získat : ' + e.message);
    });
  }

  private initForm(): void {
    this.processedDataDescFormGroup = this.formBuilder.group<ProcessedDataDescriptionModelView>({
        datasets: this.formBuilder.array([this.createDatasetItemForm()])
      }
    );
  }

  createDatasetItemForm(): FormGroup {
    return this.formBuilder.group<DatasetModel>({
      datasetId: null,
      allData: false,
      categories: [[], Validators.required],
      descriptions: this.formBuilder.array([this.createDescriptionItem(PreferredLanguage.DEFAULT)])
    });
  }

  createDescriptionItem(language: string): FormGroup {
    return this.formBuilder.group<DescriptionModel>({
      language: language,
      datasetTitle: ['', [Validators.required, CustomValidators.nameValidator]],
      datasetDescription: ['', Validators.required],
      keywords: this.formBuilder.array([]),
    });
  }

  createKeywordItem(): FormGroup {
    return this.formBuilder.group({
      keywordItem: '',
    });
  }

  addDatasetItem(): void {
    this.datasets = this.processedDataDescFormGroup.get('datasets') as FormArray;
    this.datasets.push(this.createDatasetItemForm());
  }

  removeDatasetItem(datasetIndex: number): void {
    this.datasets = this.processedDataDescFormGroup.get('datasets') as FormArray;
    this.datasets.removeAt(datasetIndex);
  }

  addKeywordItem(datasetIndex: number, descriptionIndex: number): void {
    const descriptions = this.getDescriptionsControls(datasetIndex);
    this.keywords = (descriptions[descriptionIndex].get('keywords') as FormArray);
    this.keywords.push(this.createKeywordItem());
  }

  removeKeywordItem(datasetIndex: number, descriptionIndex: number, keywordIndex: number): void {
    const descriptions = this.getDescriptionsControls(datasetIndex);
    this.keywords = (descriptions[descriptionIndex].get('keywords') as FormArray);
    this.keywords.removeAt(keywordIndex);
  }

  addDescriptionItem(datasetIndex: number) {
    this.descriptions = (this.getDatasetsControls()[datasetIndex].get('descriptions') as FormArray);
    this.descriptions.push(this.createDescriptionItem(PreferredLanguage.EN));
  }

  removeDescriptionItem(datasetIndex: number, descriptionIndex: number) {
    this.descriptions = (this.getDatasetsControls()[datasetIndex].get('descriptions') as FormArray);
    this.descriptions.removeAt(descriptionIndex);
    this.activeTabIndex = descriptionIndex - 1;
  }

  getDatasetsControls() {
    return (this.processedDataDescFormGroup.get('datasets') as FormArray).controls;
  }

  getKeywordsControls(datasetIndex: number, descriptionIndex: number) {
    const descriptions = this.getDescriptionsControls(datasetIndex);
    return (descriptions[descriptionIndex].get('keywords') as FormArray).controls;
  }

  getDescriptionsControls(datasetIndex: number) {
    return (this.getDatasetsControls()[datasetIndex].get('descriptions') as FormArray).controls;
  }


  public validateForm(): boolean {
    this.processedDataDescFormGroup.markAllAsTouched();
    return this.processedDataDescFormGroup.valid;
  }

  isTitleValid(datasetIndex: number, descriptionIndex: number, language: string): boolean {

    const descriptions = this.getDescriptionsControls(datasetIndex);
    const control = descriptions[descriptionIndex].get('datasetTitle');
    control?.updateValueAndValidity();

    const titles = this.getAllOtherDatasetTitleByLanguage(datasetIndex, language);
    titles.forEach(titleItem => {
        if (urlify(titleItem) === urlify(control?.value)) {
          this.setValidateDatasetTitleErrors(FormErrors.DUPLICITY_ERROR, datasetIndex, descriptionIndex);
        }
      }
    )

    return this.isControlValid(control);
  }

  isDescriptionValid(datasetIndex: number, descriptionIndex: number): boolean {
    return this.isControlValid(this.getDescriptionsControls(datasetIndex)[descriptionIndex].get('datasetDescription'));
  }

  isCategoryValid(index: number): boolean {
    return this.isControlValid(this.getDatasetsControls()[index].get('categories'));
  }

  private isControlValid(control: AbstractControl | null) {
    if (control) {
      return !(control.invalid && (control.dirty || control.touched));
    }
    return false;
  }

  getErrorMessage(datasetIndex: number, descriptionIndex: number, controlName: keyof DescriptionModel, humanControlName: string) {
    const descriptions = this.getDescriptionsControls(datasetIndex);
    const control = descriptions[descriptionIndex].get(controlName);

    const controlErrors: ValidationErrors | undefined | null = control?.errors;
    if (controlErrors) {
      if (Object.keys(controlErrors).includes(FormErrors.REQUIRED_ERROR)) {
        return 'Zadajte ' + humanControlName.toLowerCase();
      }
      if (Object.keys(controlErrors).includes(FormErrors.ILLEGAL_CHARACTER_ERROR)) {
        return humanControlName + ' nesmie obsahovať špeciálne znaky';
      }
      if (Object.keys(controlErrors).includes(FormErrors.DUPLICITY_ERROR)) {
        return humanControlName + ' už existuje';
      }
    }

    return 'Neznáma chyba';
  }

  handleDatasetTitle(datasetIndex: number, descriptionIndex: number, controlName: keyof DescriptionModel) {
    const descriptions = this.getDescriptionsControls(datasetIndex);
    const control = descriptions[descriptionIndex].get(controlName);
    control?.setValue(spaceGutter(control?.value));
  }

  getAllOtherDatasetTitleByLanguage(datasetIndex: number, language: string): string[] {
    let titles: string[] = [];
    this.getDatasetsControls().forEach((ds, index) => {
        if (index !== datasetIndex) {
          this.getDescriptionsControls(index).forEach(descr => {
              if (language === descr.value.language) {
                titles.push(descr.value.datasetTitle)
              }
            }
          );
        }
      }
    )
    return titles;
  }

  private setValidateDatasetTitleErrors(errorName: string, datasetIndex: number, descriptionIndex: number) {
    const dataset = ((this.processedDataDescFormGroup.controls.datasets as FormGroup).controls[datasetIndex] as FormArray);
    const descriptionControl = ((dataset.get('descriptions') as FormArray).controls[descriptionIndex] as FormGroup);
    let err = descriptionControl.get('datasetTitle')?.errors
    if (!err) {
      err = {};
    }
    err[errorName] = true;
    descriptionControl.get('datasetTitle')?.setErrors(err);
  }

  public getModelData(): ProcessedDataDescriptionModelView {
    return this.processedDataDescFormGroup.getRawValue()
  }

  activeTab(index: number) {
    this.activeTabIndex = index;
  }

  onCategoriesCheckChange(option: CodeItemModel, checked: boolean, datasetIndex: number) {
    if (!this.categoryOptions.has(datasetIndex)) {
      this.categoryOptions.set(datasetIndex, []);
    }

    let cat: CodeItemModel = {
      identifier: this.categories.codeItems.find(i => i.label === option.label)?.identifier!,
      label: option.label,
      language: option.language
    }

    if (checked && this.categoryOptions.get(datasetIndex)!.indexOf(cat) < 0) {
      this.categoryOptions.get(datasetIndex)!.push(cat);
    }

    if (!checked) {
      this.categoryOptions.set(datasetIndex, this.categoryOptions.get(datasetIndex)!.filter(x => x.identifier != cat.identifier));
    }

    this.getDatasetsControls()[datasetIndex].patchValue({
      categories: this.categoryOptions.get(datasetIndex)
    })
  }

  onDataAllChange(checked: boolean, datasetIndex: number) {

    this.getDatasetsControls()[datasetIndex].patchValue({
      allData: checked
    })
  }
}
