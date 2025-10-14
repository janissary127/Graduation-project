package Capstone.Credit_card_Recommendation_system.controller;

import Capstone.Credit_card_Recommendation_system.dto.SurveyForm;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/survey")
public class SurveyController {

    @GetMapping
    public String showSurveyForm(Model model) {
        model.addAttribute("surveyForm", new SurveyForm());
        return "survey";
    }

    @PostMapping("/submit")
    public String submitSurvey(@ModelAttribute SurveyForm surveyForm,
                               RedirectAttributes redirectAttributes) {
        // 설문조사 데이터 처리 로직
        // 여기서 데이터베이스에 저장하거나 추천 알고리즘을 실행할 수 있습니다.

        System.out.println("설문조사 제출됨: " + surveyForm.toString());

        // 제출 완료 메시지
        redirectAttributes.addFlashAttribute("message", "설문조사가 성공적으로 제출되었습니다!");
        redirectAttributes.addFlashAttribute("surveyData", surveyForm);

        // 결과 페이지로 리다이렉트
        return "redirect:/survey/result";
    }

    @GetMapping("/result")
    public String showResult(Model model) {
        // 결과 페이지 표시
        return "survey-result";
    }
}
