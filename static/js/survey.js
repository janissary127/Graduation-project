// survey.js
// 설문조사 페이지 단계별 진행 로직

(function () {
  'use strict';

  // DOM 요소
  const sections = document.querySelectorAll('.survey-section');
  const progressBar = document.getElementById('progressBar');
  const stepInfo = document.getElementById('stepInfo');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnSkip = document.getElementById('btnSkip');
  const btnSubmit = document.getElementById('btnSubmit');

  if (!sections.length) return; // 설문조사 페이지가 아니면 종료

  let currentStep = 1;
  const totalSteps = sections.length;

  // 초기화
  function init() {
    updateUI();
    attachEventListeners();
    limitCheckboxSelections();
  }

  // 이벤트 리스너 연결
  function attachEventListeners() {
    btnNext?.addEventListener('click', goToNextStep);
    btnPrev?.addEventListener('click', goToPrevStep);
    btnSkip?.addEventListener('click', goToNextStep);
  }

  // 다음 단계로
  function goToNextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
      updateUI();
      scrollToTop();
    }
  }

  // 이전 단계로
  function goToPrevStep() {
    if (currentStep > 1) {
      currentStep--;
      updateUI();
      scrollToTop();
    }
  }

  // UI 업데이트
  function updateUI() {
    // 섹션 전환
    sections.forEach((section, index) => {
      if (index + 1 === currentStep) {
        section.classList.add('is-active');
      } else {
        section.classList.remove('is-active');
      }
    });

    // 진행률 바 업데이트
    const progress = (currentStep / totalSteps) * 100;
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    // 단계 정보 업데이트
    if (stepInfo) {
      stepInfo.textContent = `${currentStep}단계 / ${totalSteps}단계`;
    }

    // 이전 버튼
    if (btnPrev) {
      btnPrev.disabled = currentStep === 1;
    }

    // 다음/제출 버튼 표시
    if (currentStep === totalSteps) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnSubmit) btnSubmit.style.display = 'inline-flex';
      if (btnSkip) btnSkip.style.display = 'none';
    } else {
      if (btnNext) btnNext.style.display = 'inline-flex';
      if (btnSubmit) btnSubmit.style.display = 'none';
      if (btnSkip) btnSkip.style.display = 'inline-block';
    }
  }

  // 스크롤을 최상단으로
  function scrollToTop() {
    const surveyBody = document.querySelector('.survey-body');
    if (surveyBody) {
      surveyBody.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 체크박스 선택 제한
  function limitCheckboxSelections() {
    // 금융 고려 요소: 최대 2개
    limitCheckboxGroup('importantFactors', 2, '최대 2개까지 선택 가능합니다.');

    // 카드 혜택: 최대 3개
    limitCheckboxGroup('preferredBenefits', 3, '최대 3개까지 선택 가능합니다.');
  }

  function limitCheckboxGroup(name, maxCount, message) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const checkedCount = document.querySelectorAll(`input[name="${name}"]:checked`).length;

        if (checkedCount > maxCount) {
          checkbox.checked = false;
          alert(message);
        }
      });
    });
  }

  // 폼 제출 전 검증 (선택사항)
  const surveyForm = document.getElementById('surveyForm');
  if (surveyForm) {
    surveyForm.addEventListener('submit', (e) => {
      // 여기에 필요한 검증 로직 추가 가능
      // 현재는 모든 항목이 선택사항이므로 별도 검증 없음

      // 제출 전 확인
      const confirmed = confirm('설문조사를 제출하시겠습니까?');
      if (!confirmed) {
        e.preventDefault();
      }
    });
  }

  // 키보드 단축키 (선택사항)
  document.addEventListener('keydown', (e) => {
    // ESC 키는 제외
    if (e.key === 'ArrowLeft' && !btnPrev?.disabled) {
      goToPrevStep();
    } else if (e.key === 'ArrowRight' && currentStep < totalSteps) {
      goToNextStep();
    }
  });

  // 초기화 실행
  init();
})();