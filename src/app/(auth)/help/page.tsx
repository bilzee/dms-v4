'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Mail, MessageSquare, FileText, ExternalLink, HelpCircle, Phone } from '@/lib/icons'

const faqItems = [
  {
    question: 'How do I create a rapid assessment?',
    answer: 'Navigate to the Assessments section from the sidebar and click "Create New Assessment". Fill in the required fields including entity, incident details, and assessment data.'
  },
  {
    question: 'How do I manage donor commitments?',
    answer: 'If you have a donor role, go to your Donor Dashboard and use the commitments tab to view, create, and manage your aid commitments.'
  },
  {
    question: 'How do I verify submitted assessments?',
    answer: 'Coordinators can access the Verification Queue from the sidebar. Review submitted assessments and approve, reject, or request changes.'
  },
  {
    question: 'How do I generate reports?',
    answer: 'Navigate to Reports from the coordinator navigation. You can create report configurations, schedule automatic generation, and download completed reports.'
  },
  {
    question: 'How do I manage users?',
    answer: 'Administrators can access User Management from the admin section. From there you can create users, manage roles, and configure permissions.'
  },
  {
    question: 'What roles are available?',
    answer: 'The system supports five roles: Assessor (field assessments), Coordinator (operations management), Responder (aid delivery), Donor (contributions), and Admin (system administration).'
  }
]

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-blue-600" />
          Help & Support
        </h1>
        <p className="text-gray-600 mt-2 hidden sm:block">Find answers to common questions and get support</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Documentation
            </CardTitle>
            <CardDescription>Read the user guides</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse the full documentation for all features and workflows.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <FileText className="h-4 w-4 mr-2" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Email Support
            </CardTitle>
            <CardDescription>Get help via email</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Contact our support team for technical issues or account questions.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@dms-system.org">
                <Mail className="h-4 w-4 mr-2" />
                support@dms-system.org
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Quick Links
            </CardTitle>
            <CardDescription>Common destinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                Dashboard
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="w-full justify-start">
                Your Profile
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            </Link>
            <Link href="/system/database">
              <Button variant="ghost" className="w-full justify-start">
                System Status
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
