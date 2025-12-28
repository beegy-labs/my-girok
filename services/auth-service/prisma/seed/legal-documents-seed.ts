/**
 * Seed script for Legal Documents
 *
 * Seeds legal documents for multiple locales:
 * - ko (Korean) - PIPA compliant
 * - en (English) - GDPR compliant
 * - ja (Japanese) - APPI compliant
 * - hi (Hindi) - DPDP compliant
 *
 * Usage: npx ts-node prisma/seed/legal-documents-seed.ts
 */

import { PrismaClient } from '../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';

const prisma = new PrismaClient();

interface LegalDocumentSeed {
  type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING_POLICY' | 'PERSONALIZED_ADS';
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string;
  effectiveDate: Date;
}

const LEGAL_DOCUMENTS: LegalDocumentSeed[] = [
  // ============================================================
  // TERMS OF SERVICE
  // ============================================================
  {
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    locale: 'ko',
    title: '서비스 이용약관',
    summary: 'My-Girok 서비스 이용에 관한 약관입니다.',
    effectiveDate: new Date('2025-01-01'),
    content: `# 서비스 이용약관

## 제1조 (목적)
이 약관은 My-Girok(이하 "회사")이 제공하는 서비스의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

## 제2조 (정의)
1. "서비스"란 회사가 제공하는 모든 온라인 서비스를 의미합니다.
2. "회원"이란 이 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 의미합니다.

## 제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.

## 제4조 (서비스의 제공)
회사는 다음과 같은 서비스를 제공합니다:
- 이력서 작성 및 관리
- 프로필 관리
- 기타 회사가 정하는 서비스

## 제5조 (회원의 의무)
회원은 다음 행위를 하여서는 안 됩니다:
- 타인의 정보 도용
- 회사의 서비스 운영을 방해하는 행위
- 법령에 위반되는 행위

## 제6조 (면책조항)
회사는 천재지변, 전쟁 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.

---
*최종 수정일: 2025년 1월 1일*`,
  },
  {
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    locale: 'en',
    title: 'Terms of Service',
    summary: 'Terms and conditions for using My-Girok services.',
    effectiveDate: new Date('2025-01-01'),
    content: `# Terms of Service

## 1. Acceptance of Terms
By accessing and using My-Girok services, you agree to be bound by these Terms of Service.

## 2. Description of Service
My-Girok provides the following services:
- Resume creation and management
- Profile management
- Other services as determined by the company

## 3. User Obligations
Users must not:
- Misuse others' personal information
- Interfere with service operations
- Violate applicable laws and regulations

## 4. Intellectual Property
All content and materials on our platform are protected by intellectual property laws.

## 5. Limitation of Liability
My-Girok shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.

## 6. Modifications
We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.

---
*Last updated: January 1, 2025*`,
  },
  {
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    locale: 'ja',
    title: '利用規約',
    summary: 'My-Girokサービスのご利用に関する規約です。',
    effectiveDate: new Date('2025-01-01'),
    content: `# 利用規約

## 第1条（目的）
本規約は、My-Girok（以下「当社」）が提供するサービスの利用条件を定めるものです。

## 第2条（定義）
1. 「サービス」とは、当社が提供するすべてのオンラインサービスを意味します。
2. 「会員」とは、本規約に同意し、当社とサービス利用契約を締結した者を意味します。

## 第3条（規約の効力および変更）
1. 本規約は、サービスを利用するすべての会員に適用されます。
2. 当社は、必要な場合、関連法令に違反しない範囲で本規約を変更することができます。

## 第4条（サービスの提供）
当社は以下のサービスを提供します：
- 履歴書の作成および管理
- プロフィール管理
- その他当社が定めるサービス

## 第5条（会員の義務）
会員は以下の行為をしてはなりません：
- 他人の情報の盗用
- 当社のサービス運営を妨害する行為
- 法令に違反する行為

## 第6条（免責事項）
当社は、天災地変、戦争等の不可抗力的事由によりサービスを提供できない場合、責任を負いません。

---
*最終更新日：2025年1月1日*`,
  },
  {
    type: 'TERMS_OF_SERVICE',
    version: '1.0.0',
    locale: 'hi',
    title: 'सेवा की शर्तें',
    summary: 'My-Girok सेवाओं के उपयोग के लिए नियम और शर्तें।',
    effectiveDate: new Date('2025-01-01'),
    content: `# सेवा की शर्तें

## 1. शर्तों की स्वीकृति
My-Girok सेवाओं का उपयोग करके, आप इन सेवा की शर्तों से बंधे होने के लिए सहमत हैं।

## 2. सेवा का विवरण
My-Girok निम्नलिखित सेवाएं प्रदान करता है:
- रिज्यूमे निर्माण और प्रबंधन
- प्रोफ़ाइल प्रबंधन
- कंपनी द्वारा निर्धारित अन्य सेवाएं

## 3. उपयोगकर्ता के दायित्व
उपयोगकर्ताओं को निम्नलिखित नहीं करना चाहिए:
- दूसरों की व्यक्तिगत जानकारी का दुरुपयोग
- सेवा संचालन में हस्तक्षेप
- लागू कानूनों और विनियमों का उल्लंघन

## 4. बौद्धिक संपदा
हमारे प्लेटफॉर्म पर सभी सामग्री बौद्धिक संपदा कानूनों द्वारा संरक्षित है।

## 5. दायित्व की सीमा
My-Girok हमारी सेवाओं के उपयोग से उत्पन्न किसी भी अप्रत्यक्ष या परिणामी क्षति के लिए उत्तरदायी नहीं होगा।

## 6. संशोधन
हम किसी भी समय इन शर्तों को संशोधित करने का अधिकार सुरक्षित रखते हैं।

---
*अंतिम अद्यतन: 1 जनवरी, 2025*`,
  },

  // ============================================================
  // PRIVACY POLICY
  // ============================================================
  {
    type: 'PRIVACY_POLICY',
    version: '1.0.0',
    locale: 'ko',
    title: '개인정보처리방침',
    summary: '개인정보의 수집, 이용, 보관에 관한 정책입니다.',
    effectiveDate: new Date('2025-01-01'),
    content: `# 개인정보처리방침

## 1. 개인정보의 수집 및 이용 목적
My-Girok은 다음의 목적을 위하여 개인정보를 수집하고 이용합니다:
- 회원 가입 및 관리
- 서비스 제공
- 고객 지원

## 2. 수집하는 개인정보 항목
- 필수항목: 이메일, 이름
- 선택항목: 프로필 사진, 연락처

## 3. 개인정보의 보유 및 이용 기간
회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보관될 수 있습니다.

## 4. 개인정보의 제3자 제공
회사는 원칙적으로 회원의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.

## 5. 개인정보의 파기
개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 파기합니다.

## 6. 정보주체의 권리
회원은 언제든지 개인정보 열람, 정정, 삭제를 요청할 수 있습니다.

## 7. 개인정보 보호책임자
- 이름: 개인정보보호팀
- 이메일: privacy@girok.dev

---
*최종 수정일: 2025년 1월 1일*`,
  },
  {
    type: 'PRIVACY_POLICY',
    version: '1.0.0',
    locale: 'en',
    title: 'Privacy Policy',
    summary: 'Policy regarding collection, use, and storage of personal data.',
    effectiveDate: new Date('2025-01-01'),
    content: `# Privacy Policy

## 1. Information We Collect
My-Girok collects the following information:
- **Required**: Email address, name
- **Optional**: Profile picture, contact information

## 2. How We Use Your Information
We use your information to:
- Provide and maintain our services
- Process your transactions
- Send you service-related communications
- Improve our services

## 3. Data Retention
We retain your personal data for as long as your account is active or as needed to provide you services.

## 4. Data Sharing
We do not sell your personal data. We may share data with:
- Service providers who assist in our operations
- Legal authorities when required by law

## 5. Your Rights (GDPR)
Under GDPR, you have the right to:
- Access your personal data
- Rectify inaccurate data
- Request deletion of your data
- Data portability
- Object to processing

## 6. Data Security
We implement appropriate technical and organizational measures to protect your data.

## 7. Contact Us
For privacy-related inquiries: privacy@girok.dev

---
*Last updated: January 1, 2025*`,
  },
  {
    type: 'PRIVACY_POLICY',
    version: '1.0.0',
    locale: 'ja',
    title: 'プライバシーポリシー',
    summary: '個人情報の収集、利用、保管に関するポリシーです。',
    effectiveDate: new Date('2025-01-01'),
    content: `# プライバシーポリシー

## 1. 収集する個人情報
My-Girokは以下の情報を収集します：
- **必須項目**: メールアドレス、氏名
- **任意項目**: プロフィール写真、連絡先

## 2. 個人情報の利用目的
- 会員登録および管理
- サービスの提供
- カスタマーサポート

## 3. 個人情報の保有期間
会員退会時まで保有し、関連法令に従い一定期間保管される場合があります。

## 4. 個人情報の第三者提供
当社は原則として会員の同意なく個人情報を第三者に提供しません。

## 5. 個人情報の廃棄
個人情報保有期間が経過した場合、または処理目的が達成された場合、速やかに廃棄します。

## 6. 情報主体の権利（APPI準拠）
会員はいつでも個人情報の開示、訂正、削除を請求できます。

## 7. 個人情報保護責任者
- メール: privacy@girok.dev

---
*最終更新日：2025年1月1日*`,
  },
  {
    type: 'PRIVACY_POLICY',
    version: '1.0.0',
    locale: 'hi',
    title: 'गोपनीयता नीति',
    summary: 'व्यक्तिगत डेटा के संग्रह, उपयोग और भंडारण से संबंधित नीति।',
    effectiveDate: new Date('2025-01-01'),
    content: `# गोपनीयता नीति

## 1. हम कौन सी जानकारी एकत्र करते हैं
My-Girok निम्नलिखित जानकारी एकत्र करता है:
- **आवश्यक**: ईमेल पता, नाम
- **वैकल्पिक**: प्रोफ़ाइल चित्र, संपर्क जानकारी

## 2. हम आपकी जानकारी का उपयोग कैसे करते हैं
- सेवाएं प्रदान करना और बनाए रखना
- आपके लेनदेन को संसाधित करना
- सेवा-संबंधित संचार भेजना
- हमारी सेवाओं में सुधार करना

## 3. डेटा प्रतिधारण
हम आपके व्यक्तिगत डेटा को तब तक रखते हैं जब तक आपका खाता सक्रिय है।

## 4. डेटा साझाकरण
हम आपका व्यक्तिगत डेटा नहीं बेचते हैं।

## 5. आपके अधिकार (DPDP अधिनियम)
DPDP अधिनियम के तहत, आपको निम्नलिखित अधिकार हैं:
- अपने व्यक्तिगत डेटा तक पहुंच
- गलत डेटा को सुधारना
- अपने डेटा को हटाने का अनुरोध

## 6. डेटा सुरक्षा
हम आपके डेटा की सुरक्षा के लिए उचित तकनीकी उपाय लागू करते हैं।

## 7. संपर्क करें
गोपनीयता संबंधी पूछताछ के लिए: privacy@girok.dev

---
*अंतिम अद्यतन: 1 जनवरी, 2025*`,
  },

  // ============================================================
  // MARKETING POLICY
  // ============================================================
  {
    type: 'MARKETING_POLICY',
    version: '1.0.0',
    locale: 'ko',
    title: '마케팅 정보 수신 동의',
    summary: '마케팅 정보 수신에 관한 동의 내용입니다.',
    effectiveDate: new Date('2025-01-01'),
    content: `# 마케팅 정보 수신 동의

## 수집 목적
- 신규 서비스 및 이벤트 안내
- 맞춤형 광고 제공
- 프로모션 정보 발송

## 수집 항목
- 이메일 주소
- 휴대폰 번호 (선택)

## 수신 방법
- 이메일
- SMS/MMS
- 앱 푸시 알림

## 동의 철회
마케팅 수신 동의는 언제든지 철회할 수 있으며, 설정 메뉴에서 변경 가능합니다.

---
*최종 수정일: 2025년 1월 1일*`,
  },
  {
    type: 'MARKETING_POLICY',
    version: '1.0.0',
    locale: 'en',
    title: 'Marketing Communications Consent',
    summary: 'Consent for receiving marketing communications.',
    effectiveDate: new Date('2025-01-01'),
    content: `# Marketing Communications Consent

## Purpose
- New service and event announcements
- Personalized advertising
- Promotional information

## Information Collected
- Email address
- Phone number (optional)

## Communication Methods
- Email
- SMS/MMS
- App push notifications

## Withdrawal of Consent
You may withdraw your marketing consent at any time through your account settings.

---
*Last updated: January 1, 2025*`,
  },
  {
    type: 'MARKETING_POLICY',
    version: '1.0.0',
    locale: 'ja',
    title: 'マーケティング情報受信同意',
    summary: 'マーケティング情報の受信に関する同意内容です。',
    effectiveDate: new Date('2025-01-01'),
    content: `# マーケティング情報受信同意

## 収集目的
- 新サービスおよびイベントのご案内
- パーソナライズ広告の提供
- プロモーション情報の配信

## 収集項目
- メールアドレス
- 電話番号（任意）

## 受信方法
- メール
- SMS/MMS
- アプリプッシュ通知

## 同意の撤回
マーケティング受信同意はいつでも撤回でき、設定メニューから変更可能です。

---
*最終更新日：2025年1月1日*`,
  },
  {
    type: 'MARKETING_POLICY',
    version: '1.0.0',
    locale: 'hi',
    title: 'मार्केटिंग संचार सहमति',
    summary: 'मार्केटिंग संचार प्राप्त करने के लिए सहमति।',
    effectiveDate: new Date('2025-01-01'),
    content: `# मार्केटिंग संचार सहमति

## उद्देश्य
- नई सेवा और इवेंट घोषणाएं
- वैयक्तिकृत विज्ञापन
- प्रचार संबंधी जानकारी

## एकत्रित जानकारी
- ईमेल पता
- फ़ोन नंबर (वैकल्पिक)

## संचार के तरीके
- ईमेल
- SMS/MMS
- ऐप पुश नोटिफिकेशन

## सहमति वापस लेना
आप किसी भी समय अपनी खाता सेटिंग के माध्यम से अपनी मार्केटिंग सहमति वापस ले सकते हैं।

---
*अंतिम अद्यतन: 1 जनवरी, 2025*`,
  },
];

async function seedLegalDocuments() {
  console.log('Seeding legal documents...\n');

  for (const doc of LEGAL_DOCUMENTS) {
    // Check if document already exists
    const existing = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM legal_documents
      WHERE type = ${doc.type}::legal_document_type
        AND version = ${doc.version}
        AND locale = ${doc.locale}
    `;

    if (Number(existing[0].count) > 0) {
      console.log(`  [SKIP] ${doc.type} v${doc.version} (${doc.locale}) - already exists`);
      continue;
    }

    const docId = ID.generate();
    await prisma.$executeRaw`
      INSERT INTO legal_documents (
        id, type, version, locale, title, content, summary, effective_date, is_active, created_at, updated_at
      ) VALUES (
        ${docId},
        ${doc.type}::legal_document_type,
        ${doc.version},
        ${doc.locale},
        ${doc.title},
        ${doc.content},
        ${doc.summary},
        ${doc.effectiveDate},
        true,
        NOW(),
        NOW()
      )
    `;

    console.log(`  [OK] ${doc.type} v${doc.version} (${doc.locale})`);
  }

  console.log('\nLegal documents seed completed!');
}

async function main() {
  try {
    await seedLegalDocuments();
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
