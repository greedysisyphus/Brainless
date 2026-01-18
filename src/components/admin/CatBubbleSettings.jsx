import React from 'react';
import CustomRuleManager from '../CustomRuleManager';

/**
 * Cat Bubble 設定組件
 * 管理貓咪對話氣泡的設定
 */
const CatBubbleSettings = ({
  showBubble,
  onShowBubbleChange,
  speechTexts,
  onSpeechTextsChange,
  intervalSeconds,
  onIntervalSecondsChange,
  smartMode,
  onSmartModeChange,
  customRules,
  onCustomRulesChange,
  scheduleTemplates,
  onScheduleTemplatesChange,
  scheduleData,
  isSaving
}) => {

  return (
    <div className="space-y-6">
      {/* 使用 CustomRuleManager，它已經包含了所有設定 */}
      <CustomRuleManager
        customRules={customRules}
        scheduleTemplates={scheduleTemplates}
        onRulesChange={onCustomRulesChange}
        onTemplatesChange={onScheduleTemplatesChange}
        isSaving={isSaving}
        scheduleData={scheduleData}
        speechTexts={speechTexts}
        onSpeechTextsChange={onSpeechTextsChange}
        showBubble={showBubble}
        onShowBubbleChange={onShowBubbleChange}
        intervalSeconds={intervalSeconds}
        onIntervalSecondsChange={onIntervalSecondsChange}
        smartMode={smartMode}
        onSmartModeChange={onSmartModeChange}
      />
    </div>
  );
};

export default CatBubbleSettings;
