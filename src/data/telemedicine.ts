export type DoctorStatus = 'Active' | 'Pending' | 'Suspended'
export type DoctorType = 'Doctor' | 'Pediatrician'

export interface DoctorDocument {
  name: string
  status: 'Submitted' | 'Verified' | 'Missing'
  note?: string
}

export interface DoctorProfile {
  id: string
  name: string
  type: DoctorType
  specialty: string
  email: string
  phone: string
  license: string
  facility: string
  submitted: string
  status: DoctorStatus
  commission: number
  consultFee: number
  rating: number
  availability: string
  languages: string[]
  verifiedAt?: string
  statusNote?: string
  rejectionNote?: string
  documents: DoctorDocument[]
}

export interface Consultation {
  id: string
  doctorId: string
  patientName: string
  patientAge: number
  issue: string
  status: 'Waiting' | 'In progress' | 'Completed' | 'Cancelled'
  scheduledAt: string
  channel: 'Chat'
  priority: 'Routine' | 'Priority'
  lastMessageAt: string
  pediatric?: boolean
  guardianName?: string
  childName?: string
  childAge?: number
  weightKg?: number
  consentStatus?: 'Pending' | 'Granted'
  dosageAlert?: boolean
}

export interface DoctorMessage {
  id: string
  sender: 'doctor' | 'patient' | 'system'
  text: string
  time: string
}

export interface DoctorMessageThread {
  id: string
  doctorId: string
  patientName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: 'Open' | 'Resolved'
  messages: DoctorMessage[]
}

export interface DoctorPrescriptionItem {
  name: string
  dosage: string
  quantity: number
}

export interface DoctorPrescription {
  id: string
  doctorId: string
  patientName: string
  createdAt: string
  status: 'Draft' | 'Sent' | 'Dispensed' | 'Cancelled'
  notes: string
  pediatric?: boolean
  items: DoctorPrescriptionItem[]
}

export interface DoctorEarning {
  id: string
  doctorId: string
  period: string
  consults: number
  revenue: number
  payoutDate: string
  status: 'Scheduled' | 'Paid' | 'On hold'
}

export interface DoctorRules {
  defaultConsultFee: number
  defaultCommission: number
  followUpDays: number
}

const defaultDoctors: DoctorProfile[] = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Johnson',
    type: 'Doctor',
    specialty: 'General Medicine',
    status: 'Active',
    email: 'sarah.johnson@avahealth.co.ke',
    phone: '+254 701 234 567',
    license: 'KMD-10234',
    facility: 'Ava Health Clinic',
    submitted: '2026-01-12',
    verifiedAt: '2026-01-14',
    commission: 15,
    consultFee: 1500,
    rating: 4.8,
    availability: 'Mon - Fri, 9:00 AM - 6:00 PM',
    languages: ['English', 'Swahili'],
    documents: [
      { name: 'Medical License', status: 'Verified' },
      { name: 'ID Document', status: 'Verified' },
      { name: 'Facility Letter', status: 'Submitted' },
    ],
  },
  {
    id: 'DOC-002',
    name: 'Dr. Michael Chen',
    type: 'Doctor',
    specialty: 'Cardiology',
    status: 'Pending',
    email: 'michael.chen@avahealth.co.ke',
    phone: '+254 702 345 678',
    license: 'KMD-12455',
    facility: 'Westlands Heart Center',
    submitted: '2026-01-19',
    commission: 18,
    consultFee: 2500,
    rating: 4.6,
    availability: 'Tue - Sat, 10:00 AM - 7:00 PM',
    languages: ['English', 'Mandarin'],
    documents: [
      { name: 'Medical License', status: 'Submitted' },
      { name: 'Specialty Certificate', status: 'Submitted' },
      { name: 'ID Document', status: 'Submitted' },
    ],
  },
  {
    id: 'PED-001',
    name: 'Dr. Mercy Otieno',
    type: 'Pediatrician',
    specialty: 'Pediatrics',
    status: 'Suspended',
    email: 'mercy.otieno@avahealth.co.ke',
    phone: '+254 703 456 789',
    license: 'KMD-11890',
    facility: 'Children Care Clinic',
    submitted: '2025-12-28',
    commission: 12,
    consultFee: 1200,
    rating: 4.7,
    availability: 'Mon - Sat, 8:00 AM - 4:00 PM',
    languages: ['English', 'Swahili'],
    statusNote: 'Awaiting updated pediatric specialization certificate.',
    documents: [
      { name: 'Medical License', status: 'Verified' },
      { name: 'Pediatric Specialty Certificate', status: 'Missing', note: 'Expired copy uploaded.' },
      { name: 'ID Document', status: 'Verified' },
    ],
  },
  {
    id: 'DOC-003',
    name: 'Dr. Liam Wanjiku',
    type: 'Doctor',
    specialty: 'Dermatology',
    status: 'Active',
    email: 'liam.wanjiku@avahealth.co.ke',
    phone: '+254 704 567 890',
    license: 'KMD-13002',
    facility: 'SkinCare Hub',
    submitted: '2026-01-08',
    verifiedAt: '2026-01-09',
    commission: 16,
    consultFee: 1800,
    rating: 4.4,
    availability: 'Mon - Fri, 10:00 AM - 5:00 PM',
    languages: ['English', 'Swahili'],
    documents: [
      { name: 'Medical License', status: 'Verified' },
      { name: 'ID Document', status: 'Verified' },
      { name: 'Facility Letter', status: 'Verified' },
    ],
  },
  {
    id: 'PED-002',
    name: 'Dr. Amina Hassan',
    type: 'Pediatrician',
    specialty: 'Neonatology',
    status: 'Pending',
    email: 'amina.hassan@avahealth.co.ke',
    phone: '+254 705 678 901',
    license: 'KMD-13521',
    facility: 'Nairobi Central Clinic',
    submitted: '2026-01-22',
    commission: 14,
    consultFee: 1800,
    rating: 4.5,
    availability: 'Mon - Fri, 9:00 AM - 3:00 PM',
    languages: ['English', 'Swahili', 'Arabic'],
    documents: [
      { name: 'Medical License', status: 'Submitted' },
      { name: 'Pediatric Specialty Certificate', status: 'Submitted' },
      { name: 'ID Document', status: 'Submitted' },
    ],
  },
  {
    id: 'DOC-004',
    name: 'Dr. Peter Mwangi',
    type: 'Doctor',
    specialty: 'Oncology',
    status: 'Active',
    email: 'peter.mwangi@avahealth.co.ke',
    phone: '+254 706 789 012',
    license: 'KMD-10987',
    facility: 'Onco Care Center',
    submitted: '2026-01-03',
    verifiedAt: '2026-01-04',
    commission: 20,
    consultFee: 3000,
    rating: 4.9,
    availability: 'Tue - Sat, 11:00 AM - 7:00 PM',
    languages: ['English', 'Swahili'],
    documents: [
      { name: 'Medical License', status: 'Verified' },
      { name: 'Specialty Certificate', status: 'Verified' },
      { name: 'ID Document', status: 'Verified' },
    ],
  },
]

const defaultConsultations: Consultation[] = [
  {
    id: 'CONS-1201',
    doctorId: 'DOC-001',
    patientName: 'Sarah M.',
    patientAge: 34,
    issue: 'Hypertension follow-up',
    status: 'Waiting',
    scheduledAt: '2026-02-07 10:30 AM',
    channel: 'Chat',
    priority: 'Routine',
    lastMessageAt: '2026-02-07 09:55 AM',
  },
  {
    id: 'CONS-1202',
    doctorId: 'DOC-001',
    patientName: 'Brian K.',
    patientAge: 27,
    issue: 'Skin rash consultation',
    status: 'In progress',
    scheduledAt: '2026-02-07 11:00 AM',
    channel: 'Chat',
    priority: 'Priority',
    lastMessageAt: '2026-02-07 10:58 AM',
  },
  {
    id: 'CONS-1203',
    doctorId: 'DOC-003',
    patientName: 'Aisha T.',
    patientAge: 31,
    issue: 'Prescription renewal',
    status: 'Waiting',
    scheduledAt: '2026-02-07 11:20 AM',
    channel: 'Chat',
    priority: 'Routine',
    lastMessageAt: '2026-02-07 10:40 AM',
  },
  {
    id: 'CONS-2201',
    doctorId: 'PED-001',
    patientName: 'Guardian: Aisha K.',
    patientAge: 29,
    issue: 'Cough and fever',
    status: 'Waiting',
    scheduledAt: '2026-02-07 09:30 AM',
    channel: 'Chat',
    priority: 'Priority',
    lastMessageAt: '2026-02-07 09:10 AM',
    pediatric: true,
    guardianName: 'Aisha K.',
    childName: 'Liam K.',
    childAge: 3,
    weightKg: 14,
    consentStatus: 'Pending',
    dosageAlert: true,
  },
  {
    id: 'CONS-2202',
    doctorId: 'PED-002',
    patientName: 'Guardian: Brian T.',
    patientAge: 33,
    issue: 'Asthma follow-up',
    status: 'In progress',
    scheduledAt: '2026-02-07 10:10 AM',
    channel: 'Chat',
    priority: 'Routine',
    lastMessageAt: '2026-02-07 10:05 AM',
    pediatric: true,
    guardianName: 'Brian T.',
    childName: 'Noah T.',
    childAge: 7,
    weightKg: 22,
    consentStatus: 'Granted',
    dosageAlert: false,
  },
]

const defaultMessageThreads: DoctorMessageThread[] = [
  {
    id: 'MSG-901',
    doctorId: 'DOC-001',
    patientName: 'Sarah M.',
    lastMessage: 'Thanks doctor, I will check in tomorrow.',
    lastMessageAt: '2026-02-07 09:40 AM',
    unreadCount: 1,
    status: 'Open',
    messages: [
      { id: 'MSG-901-1', sender: 'patient', text: 'Good morning, my BP was 140/90 today.', time: '09:30 AM' },
      { id: 'MSG-901-2', sender: 'doctor', text: 'Please monitor again after breakfast.', time: '09:35 AM' },
      { id: 'MSG-901-3', sender: 'patient', text: 'Thanks doctor, I will check in tomorrow.', time: '09:40 AM' },
    ],
  },
  {
    id: 'MSG-902',
    doctorId: 'DOC-001',
    patientName: 'Brian K.',
    lastMessage: 'Symptoms started two days ago.',
    lastMessageAt: '2026-02-07 10:50 AM',
    unreadCount: 2,
    status: 'Open',
    messages: [
      { id: 'MSG-902-1', sender: 'patient', text: 'Hi doctor, I have a rash on my arms.', time: '10:45 AM' },
      { id: 'MSG-902-2', sender: 'patient', text: 'Symptoms started two days ago.', time: '10:50 AM' },
    ],
  },
  {
    id: 'MSG-903',
    doctorId: 'PED-002',
    patientName: 'Guardian: Brian T.',
    lastMessage: 'Consent form submitted.',
    lastMessageAt: '2026-02-07 09:15 AM',
    unreadCount: 0,
    status: 'Resolved',
    messages: [
      { id: 'MSG-903-1', sender: 'patient', text: 'Consent form submitted.', time: '09:15 AM' },
      { id: 'MSG-903-2', sender: 'system', text: 'Guardian consent verified.', time: '09:17 AM' },
    ],
  },
]

const defaultPrescriptions: DoctorPrescription[] = [
  {
    id: 'RX-4501',
    doctorId: 'DOC-001',
    patientName: 'Sarah M.',
    createdAt: '2026-02-06 04:12 PM',
    status: 'Sent',
    notes: 'Monitor BP daily for 7 days.',
    items: [
      { name: 'Amlodipine', dosage: '5mg once daily', quantity: 30 },
    ],
  },
  {
    id: 'RX-4502',
    doctorId: 'DOC-003',
    patientName: 'Aisha T.',
    createdAt: '2026-02-05 01:05 PM',
    status: 'Draft',
    notes: 'Patch test recommended.',
    items: [
      { name: 'Hydrocortisone cream', dosage: 'Apply twice daily', quantity: 1 },
    ],
  },
  {
    id: 'RX-6501',
    doctorId: 'PED-002',
    patientName: 'Noah T.',
    createdAt: '2026-02-06 09:40 AM',
    status: 'Sent',
    notes: 'Use spacer for inhaler.',
    pediatric: true,
    items: [
      { name: 'Salbutamol inhaler', dosage: '2 puffs as needed', quantity: 1 },
    ],
  },
]

const defaultEarnings: DoctorEarning[] = [
  {
    id: 'PAY-1001',
    doctorId: 'DOC-001',
    period: 'Jan 2026',
    consults: 42,
    revenue: 68000,
    payoutDate: '2026-02-03',
    status: 'Paid',
  },
  {
    id: 'PAY-1002',
    doctorId: 'DOC-001',
    period: 'Feb 2026',
    consults: 12,
    revenue: 18000,
    payoutDate: '2026-03-03',
    status: 'Scheduled',
  },
  {
    id: 'PAY-2001',
    doctorId: 'PED-002',
    period: 'Jan 2026',
    consults: 28,
    revenue: 39600,
    payoutDate: '2026-02-03',
    status: 'Paid',
  },
]

const defaultRules: DoctorRules = {
  defaultConsultFee: 1500,
  defaultCommission: 15,
  followUpDays: 7,
}

const STORAGE = {
  doctors: 'ava_doctor_profiles',
  consultations: 'ava_doctor_consultations',
  messages: 'ava_doctor_messages',
  prescriptions: 'ava_doctor_prescriptions',
  earnings: 'ava_doctor_earnings',
  rules: 'ava_doctor_rules',
}

const safeLoad = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const loadDoctorProfiles = () => safeLoad(STORAGE.doctors, defaultDoctors)
export const saveDoctorProfiles = (doctors: DoctorProfile[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.doctors, JSON.stringify(doctors))
}

export const loadConsultations = () => safeLoad(STORAGE.consultations, defaultConsultations)
export const saveConsultations = (consultations: Consultation[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.consultations, JSON.stringify(consultations))
}

export const loadDoctorMessages = () => safeLoad(STORAGE.messages, defaultMessageThreads)
export const saveDoctorMessages = (threads: DoctorMessageThread[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.messages, JSON.stringify(threads))
}

export const loadDoctorPrescriptions = () => safeLoad(STORAGE.prescriptions, defaultPrescriptions)
export const saveDoctorPrescriptions = (prescriptions: DoctorPrescription[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.prescriptions, JSON.stringify(prescriptions))
}

export const loadDoctorEarnings = () => safeLoad(STORAGE.earnings, defaultEarnings)
export const saveDoctorEarnings = (earnings: DoctorEarning[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.earnings, JSON.stringify(earnings))
}

export const loadDoctorRules = () => safeLoad(STORAGE.rules, defaultRules)
export const saveDoctorRules = (rules: DoctorRules) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE.rules, JSON.stringify(rules))
}
