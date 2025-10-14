package Capstone.Credit_card_Recommendation_system.dto;

import java.util.List;

public class SurveyForm {

    // 1. 기본 정보
    private String name;
    private String contact;
    private String email;
    private String ageGroup;
    private String occupation;
    private String income;

    // 2. 현재 금융 활동 및 관심 분야
    private List<String> financialInstitutions;
    private String financialInstitutionsOther;
    private List<String> currentProducts;
    private String currentProductsOther;
    private List<String> interests;
    private String interestsOther;

    // 3. 금융 목표 및 니즈
    private String primaryGoal;
    private List<String> neededServices;
    private String neededServicesOther;
    private List<String> importantFactors;
    private String importantFactorsOther;

    // 4. 카드 사용 및 선호도
    private List<String> currentCardTypes;
    private String currentCardTypesOther;
    private List<String> cardPurpose;
    private String cardPurposeOther;
    private List<String> preferredBenefits;
    private String preferredBenefitsOther;
    private String annualFee;

    // 5. 기타 의견
    private String additionalComments;

    // Constructors
    public SurveyForm() {
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAgeGroup() {
        return ageGroup;
    }

    public void setAgeGroup(String ageGroup) {
        this.ageGroup = ageGroup;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getIncome() {
        return income;
    }

    public void setIncome(String income) {
        this.income = income;
    }

    public List<String> getFinancialInstitutions() {
        return financialInstitutions;
    }

    public void setFinancialInstitutions(List<String> financialInstitutions) {
        this.financialInstitutions = financialInstitutions;
    }

    public String getFinancialInstitutionsOther() {
        return financialInstitutionsOther;
    }

    public void setFinancialInstitutionsOther(String financialInstitutionsOther) {
        this.financialInstitutionsOther = financialInstitutionsOther;
    }

    public List<String> getCurrentProducts() {
        return currentProducts;
    }

    public void setCurrentProducts(List<String> currentProducts) {
        this.currentProducts = currentProducts;
    }

    public String getCurrentProductsOther() {
        return currentProductsOther;
    }

    public void setCurrentProductsOther(String currentProductsOther) {
        this.currentProductsOther = currentProductsOther;
    }

    public List<String> getInterests() {
        return interests;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }

    public String getInterestsOther() {
        return interestsOther;
    }

    public void setInterestsOther(String interestsOther) {
        this.interestsOther = interestsOther;
    }

    public String getPrimaryGoal() {
        return primaryGoal;
    }

    public void setPrimaryGoal(String primaryGoal) {
        this.primaryGoal = primaryGoal;
    }

    public List<String> getNeededServices() {
        return neededServices;
    }

    public void setNeededServices(List<String> neededServices) {
        this.neededServices = neededServices;
    }

    public String getNeededServicesOther() {
        return neededServicesOther;
    }

    public void setNeededServicesOther(String neededServicesOther) {
        this.neededServicesOther = neededServicesOther;
    }

    public List<String> getImportantFactors() {
        return importantFactors;
    }

    public void setImportantFactors(List<String> importantFactors) {
        this.importantFactors = importantFactors;
    }

    public String getImportantFactorsOther() {
        return importantFactorsOther;
    }

    public void setImportantFactorsOther(String importantFactorsOther) {
        this.importantFactorsOther = importantFactorsOther;
    }

    public List<String> getCurrentCardTypes() {
        return currentCardTypes;
    }

    public void setCurrentCardTypes(List<String> currentCardTypes) {
        this.currentCardTypes = currentCardTypes;
    }

    public String getCurrentCardTypesOther() {
        return currentCardTypesOther;
    }

    public void setCurrentCardTypesOther(String currentCardTypesOther) {
        this.currentCardTypesOther = currentCardTypesOther;
    }

    public List<String> getCardPurpose() {
        return cardPurpose;
    }

    public void setCardPurpose(List<String> cardPurpose) {
        this.cardPurpose = cardPurpose;
    }

    public String getCardPurposeOther() {
        return cardPurposeOther;
    }

    public void setCardPurposeOther(String cardPurposeOther) {
        this.cardPurposeOther = cardPurposeOther;
    }

    public List<String> getPreferredBenefits() {
        return preferredBenefits;
    }

    public void setPreferredBenefits(List<String> preferredBenefits) {
        this.preferredBenefits = preferredBenefits;
    }

    public String getPreferredBenefitsOther() {
        return preferredBenefitsOther;
    }

    public void setPreferredBenefitsOther(String preferredBenefitsOther) {
        this.preferredBenefitsOther = preferredBenefitsOther;
    }

    public String getAnnualFee() {
        return annualFee;
    }

    public void setAnnualFee(String annualFee) {
        this.annualFee = annualFee;
    }

    public String getAdditionalComments() {
        return additionalComments;
    }

    public void setAdditionalComments(String additionalComments) {
        this.additionalComments = additionalComments;
    }

    @Override
    public String toString() {
        return "SurveyForm{" +
                "name='" + name + '\'' +
                ", contact='" + contact + '\'' +
                ", email='" + email + '\'' +
                ", ageGroup='" + ageGroup + '\'' +
                ", occupation='" + occupation + '\'' +
                ", income='" + income + '\'' +
                ", primaryGoal='" + primaryGoal + '\'' +
                ", annualFee='" + annualFee + '\'' +
                '}';
    }
}
