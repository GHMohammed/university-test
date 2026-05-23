<div align="center">

<img src="https://img.shields.io/badge/Smart%20Attendance%20System-نظام%20الحضور%20الذكي-blue?style=for-the-badge" alt="Smart Attendance System"/>

# 🎓 نظام الحضور الذكي | Smart Attendance System

**نظام متكامل لإدارة الحضور والغياب في الجامعات باستخدام رمز QR**  
_A full-stack university attendance management system powered by QR code scanning_

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 📋 جدول المحتويات | Table of Contents

- [نظرة عامة | Overview](#-نظرة-عامة--overview)
- [المميزات | Features](#-المميزات--features)
- [التقنيات المستخدمة | Tech Stack](#-التقنيات-المستخدمة--tech-stack)
- [هيكل المشروع | Project Structure](#-هيكل-المشروع--project-structure)
- [الأدوار والصلاحيات | Roles & Permissions](#-الأدوار-والصلاحيات--roles--permissions)
- [البدء السريع | Quick Start](#-البدء-السريع--quick-start)
- [متغيرات البيئة | Environment Variables](#-متغيرات-البيئة--environment-variables)
- [قاعدة البيانات | Database Schema](#-قاعدة-البيانات--database-schema)
- [الوظائف السحابية | Edge Functions](#-الوظائف-السحابية--edge-functions)
- [الدعم متعدد اللغات | i18n Support](#-الدعم-متعدد-اللغات--i18n-support)

---

## 🌟 نظرة عامة | Overview

**نظام الحضور الذكي** هو تطبيق ويب متكامل يُمكّن الجامعات من إدارة حضور الطلاب بشكل رقمي وفعّال. يعتمد النظام على مسح رموز QR لتسجيل الحضور لحظياً، مع لوحات تحكم مخصصة لكل دور (مدير، محاضر، طالب).

**Smart Attendance System** is a full-stack web application that enables universities to manage student attendance digitally and efficiently. The system relies on QR code scanning for real-time attendance recording, with dedicated dashboards for each role (Admin, Instructor, Student).

---

## ✨ المميزات | Features

### 👨‍💼 لوحة المدير | Admin Panel

- إدارة كاملة للطلاب والمحاضرين والمقررات والقاعات
- استيراد جماعي للبيانات عبر ملفات Excel/CSV
- إنشاء وإدارة الجداول الدراسية الأسبوعية بواجهة تقويم تفاعلية
- إدارة الفصول الدراسية (Semesters/Terms) مع دعم تعدد الفصول
- تقارير وإحصائيات شاملة مع رسوم بيانية تفاعلية
- نظام تنبيهات متكامل (مخالفات الحضور، عدم تطابق الأعداد)
- إدارة قواعد الغياب والحدود المسموح بها لكل مقرر

### 👨‍🏫 لوحة المحاضر | Instructor Panel

- عرض المحاضرات المجدولة لليوم وبقية الأسبوع
- تفعيل وإغلاق جلسات الحضور بنقرة واحدة
- عرض رمز QR المتجدد تلقائياً لكل جلسة
- مراقبة الحضور المباشر (Real-time) مع تحديث تلقائي
- تسجيل الحضور يدوياً للطلاب (حضور/غياب)
- التحقق من عدد الطلاب (Headcount Verification) وإنشاء تنبيهات عند وجود تفاوت
- تقارير الحضور التفصيلية لكل مقرر

### 🎓 لوحة الطالب | Student Panel

- مسح رمز QR عبر الكاميرا أو إدخال الرمز يدوياً لتسجيل الحضور
- عرض جدول المقررات الأسبوعي التفاعلي
- تتبع سجل الحضور لكل مقرر مع إحصائيات تفصيلية
- عرض حالة الغياب (آمن / تحذير / حرج) لكل مقرر
- استقبال التنبيهات والتحذيرات المتعلقة بالحضور

### 🔧 مميزات عامة | General Features

- واجهة **ثنائية اللغة** (العربية/الإنجليزية) مع دعم RTL/LTR كامل
- تصميم **متجاوب** يدعم جميع أحجام الشاشات
- **مصادقة آمنة** قائمة على Supabase Auth مع نظام أدوار (RBAC)
- **تحديثات فورية** للبيانات عبر Supabase Realtime

---

## 🛠 التقنيات المستخدمة | Tech Stack

| الطبقة               | التقنية                   | الغرض                                |
| -------------------- | ------------------------- | ------------------------------------ |
| **Frontend**         | React 18 + TypeScript     | واجهة المستخدم                       |
| **Build Tool**       | Vite 5                    | بناء وتطوير المشروع                  |
| **Styling**          | Tailwind CSS + shadcn/ui  | التصميم والمكونات                    |
| **State Management** | TanStack Query v5         | إدارة الحالة والطلبات                |
| **Routing**          | React Router v6           | التنقل بين الصفحات                   |
| **Backend**          | Supabase                  | قاعدة بيانات، مصادقة، Edge Functions |
| **Database**         | PostgreSQL (via Supabase) | تخزين البيانات                       |
| **QR Scanning**      | @yudiel/react-qr-scanner  | مسح رموز QR                          |
| **QR Generation**    | qrcode.react              | توليد رموز QR                        |
| **Charts**           | Recharts                  | الرسوم البيانية                      |
| **Forms**            | React Hook Form + Zod     | إدارة النماذج والتحقق                |
| **Date Handling**    | date-fns                  | معالجة التواريخ                      |
| **Excel Export**     | SheetJS (xlsx)            | استيراد/تصدير البيانات               |
| **Notifications**    | Sonner                    | إشعارات التطبيق                      |
| **Icons**            | Lucide React              | الأيقونات                            |

---

## 📁 هيكل المشروع | Project Structure

```
src/
├── components/
│   ├── alerts/          # مكونات التنبيهات
│   ├── analytics/       # مكونات الرسوم البيانية والإحصائيات
│   ├── attendance/      # مكونات الحضور (Badges, Manual Panel)
│   ├── courses/         # استيراد المقررات الجماعي
│   ├── dashboard/       # مكونات مشتركة (PageHeader, StatCard, EmptyState)
│   ├── enrollments/     # استيراد التسجيل الجماعي
│   ├── instructors/     # استيراد المحاضرين الجماعي
│   ├── layout/          # AppSidebar, TopNavbar, DashboardLayout
│   ├── settings/        # نموذج الإعدادات
│   ├── students/        # استيراد الطلاب الجماعي
│   └── ui/              # مكونات shadcn/ui
│
├── hooks/
│   ├── useAttendance.ts     # إدارة الحضور
│   ├── useSessions.ts       # إدارة الجلسات
│   ├── useSchedules.ts      # إدارة الجداول
│   ├── useAnalytics.ts      # الإحصائيات والتقارير
│   ├── useAlerts.ts         # التنبيهات
│   ├── useAbsenceRules.ts   # قواعد الغياب
│   ├── useAcademicTerms.ts  # الفصول الدراسية
│   └── ...
│
├── lib/
│   ├── auth.tsx         # AuthContext + AuthProvider
│   ├── i18n.tsx         # نظام الترجمة (AR/EN)
│   ├── termContext.tsx  # سياق الفصل الدراسي
│   └── utils.ts         # أدوات مساعدة
│
├── pages/
│   ├── admin/           # صفحات لوحة المدير
│   ├── instructor/      # صفحات لوحة المحاضر
│   └── student/         # صفحات لوحة الطالب
│
├── types/
│   └── index.ts         # أنواع TypeScript المشتركة
│
└── integrations/
    └── supabase/
        ├── client.ts    # Supabase client
        └── types.ts     # أنواع قاعدة البيانات (Auto-generated)

supabase/
├── functions/
│   ├── admin-create-user/   # إنشاء المستخدمين (Edge Function)
│   └── submit-attendance/   # تسجيل الحضور (Edge Function)
└── migrations/              # ملفات ترحيل قاعدة البيانات
```

---

## 👥 الأدوار والصلاحيات | Roles & Permissions

يعتمد النظام على نظام RBAC (Role-Based Access Control) بثلاثة أدوار:

```
┌─────────────────────────────────────────────────┐
│                   app_role                       │
├──────────┬──────────────────┬────────────────────┤
│  admin   │   instructor     │      student       │
├──────────┼──────────────────┼────────────────────┤
│ إدارة    │ إنشاء الجلسات   │ مسح QR             │
│ كاملة    │ عرض QR          │ عرض الجدول         │
│ للنظام   │ مراقبة الحضور   │ سجل الحضور         │
│          │ التحقق العددي   │ التنبيهات          │
└──────────┴──────────────────┴────────────────────┘
```

---

## 🚀 البدء السريع | Quick Start

### المتطلبات | Prerequisites

- [Node.js](https://nodejs.org/) v18 أو أحدث
- [npm](https://www.npmjs.com/) أو [yarn](https://yarnpkg.com/)
- حساب [Supabase](https://supabase.com/)

### خطوات التثبيت | Installation

```bash
# 1. استنساخ المستودع
git clone <YOUR_REPO_URL>
cd smart-attendance-system

# 2. تثبيت الحزم
npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env
# عدّل ملف .env بقيم مشروع Supabase الخاص بك

# 4. تشغيل بيئة التطوير
npm run dev
```

التطبيق سيكون متاحاً على `http://localhost:8080`

### بناء الإنتاج | Production Build

```bash
npm run build
npm run preview
```

---

## 🔑 متغيرات البيئة | Environment Variables

أنشئ ملف `.env` في جذر المشروع بالمتغيرات التالية:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```


---

## 🗄 قاعدة البيانات | Database Schema

### الجداول الرئيسية | Main Tables

```
profiles              ← بيانات المستخدمين
user_roles            ← أدوار المستخدمين (admin/instructor/student)
courses               ← المقررات الدراسية
classrooms            ← قاعات الدرس
schedules             ← الجداول الأسبوعية
academic_terms        ← الفصول الدراسية
enrollments           ← تسجيل الطلاب في المقررات
lecture_sessions      ← جلسات المحاضرات
attendance_records    ← سجلات الحضور
headcount_verifications ← التحقق من الأعداد
alerts                ← التنبيهات والإشعارات
absence_rules         ← قواعد الغياب
time_slots            ← الفترات الزمنية
active_days           ← الأيام النشطة في الجدول
```

### تشغيل Migration | Run Migrations

```bash
# باستخدام Supabase CLI
supabase db push

# أو تطبيق الملفات يدوياً من مجلد
supabase/migrations/
```

---

## ⚡ الوظائف السحابية | Edge Functions

يعتمد النظام على وظيفتين رئيسيتين من Supabase Edge Functions:

### `admin-create-user`

إنشاء مستخدمين جدد (طلاب/محاضرين) بواسطة المدير مع تعيين الدور والمعلومات الإضافية.

```
POST /functions/v1/admin-create-user
Authorization: Bearer <admin_token>

Body: { email, password, full_name, role, phone?, student_code?, ... }
```

### `submit-attendance`

تسجيل حضور الطالب عبر رمز QR مع التحقق من صلاحية الجلسة والتسجيل والمكررات.

```
POST /functions/v1/submit-attendance
Authorization: Bearer <student_token>

Body: { qr_token }
```

---

## 🌐 الدعم متعدد اللغات | i18n Support

يدعم النظام اللغتين **العربية** و**الإنجليزية** مع دعم كامل لاتجاه النص:

| اللغة   | الاتجاه             | الخط                 |
| ------- | ------------------- | -------------------- |
| العربية | RTL (يمين لليسار)   | IBM Plex Sans Arabic |
| English | LTR (left to right) | Inter                |

يتم حفظ تفضيل اللغة في `localStorage` ويمكن تغييرها من:

- زر اللغة في الشريط العلوي
- صفحة الإعدادات

---

## 📊 سير العمل الأساسي | Core Workflow

```
المدير                المحاضر              الطالب
  │                      │                    │
  │ ينشئ مقرر/جدول        │                    │
  │──────────────────────>│                    │
  │                      │ يفعّل الجلسة        │
  │                      │ (QR يُولَّد تلقائياً) │
  │                      │──────────────────>  │
  │                      │                    │ يمسح QR
  │                      │                    │ بالكاميرا
  │                      │<──────────────────  │
  │                      │ يراقب الحضور         │
  │                      │ المباشر             │
  │                      │                    │
  │                      │ يُغلق الجلسة        │
  │ يُراجع التقارير        │                    │
  │<──────────────────────│                    │
```

---

## 🧪 الاختبارات | Testing

```bash
# تشغيل الاختبارات
npm run test

# وضع المراقبة
npm run test:watch
```

---

<div align="center">

_Built with ❤️ by Mohammad Nour Aldeen_

</div>
