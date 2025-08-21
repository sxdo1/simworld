import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import * as THREE from 'three'
import { EducationLevel } from '../types/agents'
import { Building } from '../types/buildings'
import { EDUCATION_CONFIG } from '../utils/gameConstants'

export interface School {
  id: string
  buildingId: string
  name: string
  educationType: 'primary' | 'secondary' | 'university' | 'vocational'
  capacity: number
  currentEnrollment: number
  quality: number
  funding: number
  teacherCount: number
  serviceRange: number
  tuitionCost: number
  graduationRate: number
  achievements: SchoolAchievement[]
  specialPrograms: string[]
  isOperational: boolean
}

export interface Student {
  id: string
  citizenId: string
  schoolId: string
  homeId: string
  educationLevel: EducationLevel
  academicPerformance: number
  attendance: number
  graduationProgress: number
  isGraduating: boolean
  specialNeeds: string[]
  extracurricularActivities: string[]
}

export interface SchoolAchievement {
  id: string
  name: string
  description: string
  category: 'academic' | 'sports' | 'arts' | 'community'
  unlockedDate: Date
  bonus: Record<string, number>
}

export interface EducationDemand {
  primary: number
  secondary: number
  university: number
  vocational: number
  total: number
}

interface EducationStore {
  // Core data
  schools: School[]
  students: Student[]
  teachers: Array<{
    id: string
    schoolId: string
    subject: string
    experience: number
    salary: number
  }>
  
  // System state
  isInitialized: boolean
  totalEducationBudget: number
  educationTaxRate: number
  
  // Statistics
  literacyRate: number
  averageEducationLevel: number
  educationSatisfaction: number
  
  // Actions
  initializeEducationSystem: () => void
  updateEducationSystem: (deltaTime: number) => void
  
  // School management
  createSchool: (building: Building, educationType: School['educationType']) => School
  updateSchool: (schoolId: string, updates: Partial<School>) => void
  closeSchool: (schoolId: string) => void
  upgradeSchool: (schoolId: string, upgradeType: string) => boolean
  
  // Student management
  enrollStudent: (citizenId: string, schoolId: string, homeId: string) => Student | null
  graduateStudent: (studentId: string) => void
  expelStudent: (studentId: string, reason: string) => void
  transferStudent: (studentId: string, newSchoolId: string) => boolean
  
  // Education progression
  updateStudentProgress: (deltaTime: number) => void
  processGraduations: () => void
  assignEducationLevels: () => void
  
  // Education demand and supply
  calculateEducationDemand: (buildings: Building[]) => void
  getEducationDemand: (x: number, z: number) => EducationDemand
  getAvailableCapacity: (educationType: School['educationType']) => number
  
  // School operations
  hireTeacher: (schoolId: string, subject: string) => boolean
  fireTeacher: (teacherId: string) => void
  updateSchoolFunding: (schoolId: string, funding: number) => void
  calculateSchoolQuality: (schoolId: string) => number
  
  // Academic performance
  updateAcademicPerformance: () => void
  getSchoolPerformance: (schoolId: string) => {
    averageGPA: number
    graduationRate: number
    attendanceRate: number
    teacherStudentRatio: number
  }
  
  // Special programs and achievements
  unlockAchievement: (schoolId: string, achievementType: string) => void
  addSpecialProgram: (schoolId: string, programType: string) => boolean
  
  // Statistics and reporting
  calculateEducationStatistics: () => void
  generateEducationReport: () => {
    totalStudents: number
    totalTeachers: number
    budgetUtilization: number
    systemWidePerformance: number
  }
  
  // Utility functions
  getSchoolCapacity: (schoolId: string) => number
  getSchoolsByType: (educationType: School['educationType']) => School[]
  getStudentsInSchool: (schoolId: string) => Student[]
  findNearestSchool: (position: THREE.Vector3, educationType: School['educationType']) => School | null
}

export const useEducationStore = create<EducationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    schools: [],
    students: [],
    teachers: [],
    
    isInitialized: false,
    totalEducationBudget: 50000,
    educationTaxRate: 3,
    
    literacyRate: 85,
    averageEducationLevel: 2.5,
    educationSatisfaction: 70,

    initializeEducationSystem: () => {
      console.log('🎓 Initializing education system...')
      
      set({
        schools: [],
        students: [],
        teachers: [],
        isInitialized: true,
        literacyRate: 85,
        averageEducationLevel: 2.5,
        educationSatisfaction: 70
      })
      
      console.log('✅ Education system initialized')
    },

    updateEducationSystem: (deltaTime: number) => {
      if (!get().isInitialized) return
      
      // Update student progress
      get().updateStudentProgress(deltaTime)
      
      // Process graduations
      get().processGraduations()
      
      // Update academic performance
      get().updateAcademicPerformance()
      
      // Calculate system statistics
      get().calculateEducationStatistics()
    },

    createSchool: (building: Building, educationType: School['educationType']) => {
      const schoolId = `school_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const capacityMap = EDUCATION_CONFIG.SCHOOL_CAPACITY
      const baseCapacity = capacityMap[educationType] || capacityMap.elementary
      
      const school: School = {
        id: schoolId,
        buildingId: building.id,
        name: `${building.name} ${educationType.charAt(0).toUpperCase() + educationType.slice(1)} School`,
        educationType,
        capacity: baseCapacity,
        currentEnrollment: 0,
        quality: 0.7, // Base quality
        funding: 10000,
        teacherCount: Math.floor(baseCapacity / 25), // 25 students per teacher
        serviceRange: 15,
        tuitionCost: educationType === 'university' ? 5000 : 0,
        graduationRate: 0.8,
        achievements: [],
        specialPrograms: [],
        isOperational: true
      }
      
      // Hire initial teachers
      const subjects = educationType === 'primary' 
        ? ['general', 'math', 'reading']
        : educationType === 'secondary'
        ? ['math', 'science', 'english', 'history', 'arts']
        : ['specialized', 'research', 'advanced']
      
      const teachers = get().teachers
      subjects.forEach(subject => {
        teachers.push({
          id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          schoolId: schoolId,
          subject,
          experience: 1 + Math.random() * 10,
          salary: 40000 + Math.random() * 20000
        })
      })
      
      console.log(`🏫 Created ${educationType} school: ${school.name}`)
      
      const schools = [...get().schools, school]
      set({ schools, teachers })
      
      return school
    },

    updateSchool: (schoolId: string, updates: Partial<School>) => {
      const schools = get().schools.map(school => 
        school.id === schoolId ? { ...school, ...updates } : school
      )
      set({ schools })
    },

    closeSchool: (schoolId: string) => {
      const state = get()
      
      // Transfer students to other schools
      const studentsToTransfer = state.students.filter(s => s.schoolId === schoolId)
      studentsToTransfer.forEach(student => {
        const school = state.schools.find(s => s.id === schoolId)
        if (school) {
          const alternativeSchools = get().getSchoolsByType(school.educationType)
            .filter(s => s.id !== schoolId && s.currentEnrollment < s.capacity)
          
          if (alternativeSchools.length > 0) {
            const newSchool = alternativeSchools[0]
            get().transferStudent(student.id, newSchool.id)
          } else {
            get().expelStudent(student.id, 'school closure')
          }
        }
      })
      
      // Remove teachers
      const teachers = state.teachers.filter(t => t.schoolId !== schoolId)
      
      // Remove school
      const schools = state.schools.filter(s => s.id !== schoolId)
      
      console.log(`🏫 Closed school: ${schoolId}`)
      set({ schools, teachers })
    },

    upgradeSchool: (schoolId: string, upgradeType: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school) return false
      
      const upgradeCosts = {
        'expand_capacity': 20000,
        'improve_quality': 15000,
        'add_program': 10000,
        'hire_teachers': 5000
      }
      
      const cost = upgradeCosts[upgradeType as keyof typeof upgradeCosts] || 10000
      
      // Check if we have budget (simplified - would integrate with economy)
      if (get().totalEducationBudget < cost) {
        return false
      }
      
      const updates: Partial<School> = {}
      
      switch (upgradeType) {
        case 'expand_capacity':
          updates.capacity = Math.floor(school.capacity * 1.3)
          break
        case 'improve_quality':
          updates.quality = Math.min(1, school.quality + 0.2)
          break
        case 'add_program':
          if (!school.specialPrograms.includes('advanced_placement')) {
            updates.specialPrograms = [...school.specialPrograms, 'advanced_placement']
          }
          break
        case 'hire_teachers':
          updates.teacherCount = school.teacherCount + 2
          break
      }
      
      get().updateSchool(schoolId, updates)
      
      set({ totalEducationBudget: get().totalEducationBudget - cost })
      
      console.log(`📈 Upgraded school ${schoolId} with ${upgradeType}`)
      return true
    },

    enrollStudent: (citizenId: string, schoolId: string, homeId: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school || school.currentEnrollment >= school.capacity) {
        return null
      }
      
      const educationLevelMap: Record<School['educationType'], EducationLevel> = {
        primary: 'primary',
        secondary: 'secondary',
        university: 'university',
        vocational: 'advanced'
      }
      
      const student: Student = {
        id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        citizenId,
        schoolId,
        homeId,
        educationLevel: educationLevelMap[school.educationType],
        academicPerformance: 0.5 + Math.random() * 0.3,
        attendance: 0.8 + Math.random() * 0.15,
        graduationProgress: 0,
        isGraduating: false,
        specialNeeds: [],
        extracurricularActivities: []
      }
      
      // Update school enrollment
      get().updateSchool(schoolId, {
        currentEnrollment: school.currentEnrollment + 1
      })
      
      const students = [...get().students, student]
      set({ students })
      
      console.log(`📚 Enrolled student ${citizenId} in school ${schoolId}`)
      return student
    },

    graduateStudent: (studentId: string) => {
      const student = get().students.find(s => s.id === studentId)
      if (!student) return
      
      const school = get().schools.find(s => s.id === student.schoolId)
      if (!school) return
      
      // Update school statistics
      get().updateSchool(student.schoolId, {
        currentEnrollment: school.currentEnrollment - 1
      })
      
      // Remove student from education system
      const students = get().students.filter(s => s.id !== studentId)
      set({ students })
      
      console.log(`🎓 Student ${student.citizenId} graduated from ${school.name}`)
      
      // Trigger graduation achievement
      if (school.currentEnrollment > 0 && Math.random() < 0.1) {
        get().unlockAchievement(school.id, 'high_graduation_rate')
      }
    },

    expelStudent: (studentId: string, reason: string) => {
      const student = get().students.find(s => s.id === studentId)
      if (!student) return
      
      const school = get().schools.find(s => s.id === student.schoolId)
      if (school) {
        get().updateSchool(student.schoolId, {
          currentEnrollment: school.currentEnrollment - 1
        })
      }
      
      const students = get().students.filter(s => s.id !== studentId)
      set({ students })
      
      console.log(`❌ Expelled student ${student.citizenId}: ${reason}`)
    },

    transferStudent: (studentId: string, newSchoolId: string) => {
      const student = get().students.find(s => s.id === studentId)
      const newSchool = get().schools.find(s => s.id === newSchoolId)
      const oldSchool = get().schools.find(s => s.id === student?.schoolId)
      
      if (!student || !newSchool || !oldSchool) return false
      
      if (newSchool.currentEnrollment >= newSchool.capacity) return false
      
      // Update enrollments
      get().updateSchool(oldSchool.id, {
        currentEnrollment: oldSchool.currentEnrollment - 1
      })
      
      get().updateSchool(newSchool.id, {
        currentEnrollment: newSchool.currentEnrollment + 1
      })
      
      // Update student
      const students = get().students.map(s => 
        s.id === studentId ? { ...s, schoolId: newSchoolId } : s
      )
      set({ students })
      
      console.log(`🔄 Transferred student ${student.citizenId} to ${newSchool.name}`)
      return true
    },

    updateStudentProgress: (deltaTime: number) => {
      const students = get().students.map(student => {
        const school = get().schools.find(s => s.id === student.schoolId)
        if (!school || !school.isOperational) return student
        
        // Calculate progress based on school quality and student performance
        const progressRate = (school.quality * student.academicPerformance * student.attendance) / 100
        const newProgress = student.graduationProgress + (progressRate * deltaTime)
        
        const updatedStudent = {
          ...student,
          graduationProgress: Math.min(1, newProgress)
        }
        
        // Check for graduation
        if (updatedStudent.graduationProgress >= 1 && !updatedStudent.isGraduating) {
          updatedStudent.isGraduating = true
        }
        
        return updatedStudent
      })
      
      set({ students })
    },

    processGraduations: () => {
      const graduatingStudents = get().students.filter(s => s.isGraduating)
      
      graduatingStudents.forEach(student => {
        get().graduateStudent(student.id)
      })
    },

    assignEducationLevels: () => {
      // This would integrate with the agent system to update citizen education levels
      const graduates = get().students.filter(s => s.graduationProgress >= 1)
      
      console.log(`🎓 Processing education level updates for ${graduates.length} graduates`)
    },

    calculateEducationDemand: (buildings: Building[]) => {
      // Calculate education demand based on residential buildings and demographics
      const residentialBuildings = buildings.filter(b => 
        b.zoneType === 'residential' && b.status === 'operational'
      )
      
      let totalDemand = 0
      
      residentialBuildings.forEach(building => {
        const residents = building.residents || 0
        const childrenRatio = 0.3 // 30% of residents are children
        const children = Math.floor(residents * childrenRatio)
        
        totalDemand += children
      })
      
      // Update demand statistics (simplified)
      console.log(`📊 Total education demand: ${totalDemand}`)
    },

    getEducationDemand: (x: number, z: number) => {
      // Calculate demand in a specific area
      const nearbySchools = get().schools.filter(school => {
        // Find school building position (simplified)
        return true // Would calculate actual distance
      })
      
      return {
        primary: 50,
        secondary: 30,
        university: 10,
        vocational: 5,
        total: 95
      }
    },

    getAvailableCapacity: (educationType: School['educationType']) => {
      const schools = get().getSchoolsByType(educationType)
      return schools.reduce((total, school) => 
        total + (school.capacity - school.currentEnrollment), 0
      )
    },

    hireTeacher: (schoolId: string, subject: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school) return false
      
      const salary = 40000 + Math.random() * 20000
      const monthlyCost = salary / 12
      
      if (get().totalEducationBudget < monthlyCost * 12) {
        return false // Not enough budget
      }
      
      const teacher = {
        id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        schoolId,
        subject,
        experience: 1 + Math.random() * 5,
        salary
      }
      
      const teachers = [...get().teachers, teacher]
      set({ 
        teachers,
        totalEducationBudget: get().totalEducationBudget - monthlyCost * 12
      })
      
      get().updateSchool(schoolId, {
        teacherCount: school.teacherCount + 1
      })
      
      console.log(`👨‍🏫 Hired teacher for ${school.name}: ${subject}`)
      return true
    },

    fireTeacher: (teacherId: string) => {
      const teacher = get().teachers.find(t => t.id === teacherId)
      if (!teacher) return
      
      const school = get().schools.find(s => s.id === teacher.schoolId)
      if (school) {
        get().updateSchool(school.id, {
          teacherCount: Math.max(0, school.teacherCount - 1)
        })
      }
      
      const teachers = get().teachers.filter(t => t.id !== teacherId)
      set({ teachers })
      
      console.log(`❌ Fired teacher: ${teacherId}`)
    },

    updateSchoolFunding: (schoolId: string, funding: number) => {
      get().updateSchool(schoolId, { funding })
    },

    calculateSchoolQuality: (schoolId: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school) return 0
      
      const teacherStudentRatio = school.teacherCount / Math.max(1, school.currentEnrollment)
      const fundingPerStudent = school.funding / Math.max(1, school.currentEnrollment)
      
      let quality = 0.3 // Base quality
      quality += Math.min(0.3, teacherStudentRatio * 10) // Teacher ratio bonus
      quality += Math.min(0.2, fundingPerStudent / 1000) // Funding bonus
      quality += school.specialPrograms.length * 0.05 // Program bonus
      
      return Math.min(1, quality)
    },

    updateAcademicPerformance: () => {
      const schools = get().schools
      
      schools.forEach(school => {
        const schoolStudents = get().getStudentsInSchool(school.id)
        
        if (schoolStudents.length === 0) return
        
        const averagePerformance = schoolStudents.reduce((sum, student) => 
          sum + student.academicPerformance, 0) / schoolStudents.length
        
        const averageAttendance = schoolStudents.reduce((sum, student) => 
          sum + student.attendance, 0) / schoolStudents.length
        
        const graduationRate = schoolStudents.filter(s => s.graduationProgress >= 1).length / 
                              Math.max(1, schoolStudents.length)
        
        get().updateSchool(school.id, {
          graduationRate: graduationRate || school.graduationRate
        })
      })
    },

    getSchoolPerformance: (schoolId: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      const students = get().getStudentsInSchool(schoolId)
      
      if (!school || students.length === 0) {
        return {
          averageGPA: 0,
          graduationRate: 0,
          attendanceRate: 0,
          teacherStudentRatio: 0
        }
      }
      
      const averageGPA = students.reduce((sum, s) => sum + s.academicPerformance, 0) / students.length * 4
      const attendanceRate = students.reduce((sum, s) => sum + s.attendance, 0) / students.length
      const teacherStudentRatio = school.teacherCount / students.length
      
      return {
        averageGPA,
        graduationRate: school.graduationRate,
        attendanceRate,
        teacherStudentRatio
      }
    },

    unlockAchievement: (schoolId: string, achievementType: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school) return
      
      const achievementTemplates = {
        high_graduation_rate: {
          name: 'Excellence in Education',
          description: 'Achieved 90%+ graduation rate',
          category: 'academic' as const,
          bonus: { quality: 0.1, funding: 5000 }
        },
        perfect_attendance: {
          name: 'Perfect Attendance',
          description: 'Students achieved 98%+ attendance rate',
          category: 'academic' as const,
          bonus: { quality: 0.05, satisfaction: 10 }
        },
        innovation_award: {
          name: 'Innovation Award',
          description: 'Pioneered educational technology',
          category: 'academic' as const,
          bonus: { quality: 0.15 }
        }
      }
      
      const template = achievementTemplates[achievementType as keyof typeof achievementTemplates]
      if (!template) return
      
      const achievement: SchoolAchievement = {
        id: `achievement_${Date.now()}`,
        ...template,
        unlockedDate: new Date()
      }
      
      const updatedAchievements = [...school.achievements, achievement]
      
      // Apply bonuses
      const updates: Partial<School> = {
        achievements: updatedAchievements,
        quality: Math.min(1, school.quality + (template.bonus.quality || 0)),
        funding: school.funding + (template.bonus.funding || 0)
      }
      
      get().updateSchool(schoolId, updates)
      
      console.log(`🏆 School ${school.name} unlocked achievement: ${achievement.name}`)
    },

    addSpecialProgram: (schoolId: string, programType: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      if (!school) return false
      
      const programCosts = {
        'advanced_placement': 15000,
        'arts_program': 10000,
        'sports_program': 12000,
        'stem_focus': 18000,
        'language_immersion': 8000
      }
      
      const cost = programCosts[programType as keyof typeof programCosts] || 10000
      
      if (get().totalEducationBudget < cost) {
        return false
      }
      
      if (school.specialPrograms.includes(programType)) {
        return false // Already has this program
      }
      
      const updatedPrograms = [...school.specialPrograms, programType]
      
      get().updateSchool(schoolId, {
        specialPrograms: updatedPrograms,
        quality: Math.min(1, school.quality + 0.05) // Small quality boost
      })
      
      set({ totalEducationBudget: get().totalEducationBudget - cost })
      
      console.log(`📚 Added special program to ${school.name}: ${programType}`)
      return true
    },

    calculateEducationStatistics: () => {
      const state = get()
      const totalStudents = state.students.length
      const operationalSchools = state.schools.filter(s => s.isOperational)
      
      if (totalStudents === 0) {
        set({
          literacyRate: 85,
          averageEducationLevel: 2.5,
          educationSatisfaction: 70
        })
        return
      }
      
      // Calculate literacy rate
      const educatedStudents = state.students.filter(s => s.educationLevel !== 'none')
      const literacyRate = (educatedStudents.length / totalStudents) * 100
      
      // Calculate average education level
      const educationLevelValues = {
        'none': 0,
        'primary': 1,
        'secondary': 2,
        'university': 3,
        'advanced': 4
      }
      
      const totalEducationValue = state.students.reduce((sum, student) => 
        sum + educationLevelValues[student.educationLevel], 0
      )
      const averageEducationLevel = totalEducationValue / totalStudents
      
      // Calculate satisfaction based on school quality and capacity utilization
      const totalCapacity = operationalSchools.reduce((sum, school) => sum + school.capacity, 0)
      const utilizationRate = totalCapacity > 0 ? totalStudents / totalCapacity : 0
      const averageQuality = operationalSchools.reduce((sum, school) => sum + school.quality, 0) / 
                           Math.max(1, operationalSchools.length)
      
      const educationSatisfaction = Math.min(100, (averageQuality * 50) + (Math.min(1, utilizationRate) * 30) + 20)
      
      set({
        literacyRate: Math.min(100, literacyRate),
        averageEducationLevel,
        educationSatisfaction: Math.max(0, educationSatisfaction)
      })
    },

    generateEducationReport: () => {
      const state = get()
      
      return {
        totalStudents: state.students.length,
        totalTeachers: state.teachers.length,
        budgetUtilization: state.totalEducationBudget > 0 ? 
          (50000 - state.totalEducationBudget) / 50000 * 100 : 0,
        systemWidePerformance: state.educationSatisfaction
      }
    },

    getSchoolCapacity: (schoolId: string) => {
      const school = get().schools.find(s => s.id === schoolId)
      return school ? school.capacity : 0
    },

    getSchoolsByType: (educationType: School['educationType']) => {
      return get().schools.filter(s => s.educationType === educationType && s.isOperational)
    },

    getStudentsInSchool: (schoolId: string) => {
      return get().students.filter(s => s.schoolId === schoolId)
    },

    findNearestSchool: (position: THREE.Vector3, educationType: School['educationType']) => {
      const schools = get().getSchoolsByType(educationType)
      let nearestSchool: School | null = null
      let minDistance = Infinity
      
      // This would need building positions - simplified for now
      schools.forEach(school => {
        if (school.currentEnrollment < school.capacity) {
          // Would calculate actual distance to building
          const distance = Math.random() * 100 // Placeholder
          if (distance < minDistance) {
            minDistance = distance
            nearestSchool = school
          }
        }
      })
      
      return nearestSchool
    }
  }))
)
