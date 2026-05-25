'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Mail, Settings, Info, X } from '@/lib/icons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useExportStore } from '@/stores/export.store';

const ExportRequestSchema = z.object({
  dataType: z.string().min(1, 'Data type is required'),
  format: z.enum(['csv', 'xlsx', 'png', 'svg', 'pdf']),
  dateRange: z.object({
    type: z.enum(['last_24_hours', 'last_7_days', 'last_30_days', 'current_month', 'custom']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  filters: z.record(z.any()).optional(),
  options: z.object({
    includeCharts: z.boolean().default(true),
    includeMaps: z.boolean().default(true),
    includeImages: z.boolean().default(false),
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    watermark: z.string().optional(),
  }).optional(),
  recipients: z.array(z.object({
    email: z.string().email('Valid email is required'),
    name: z.string().optional(),
    format: z.enum(['pdf', 'csv', 'html']).default('pdf'),
  })).optional(),
  schedule: z.object({
    frequency: z.enum(['immediate', 'daily', 'weekly', 'monthly']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Valid time format required (HH:MM)'),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
  }).optional(),
});

type ExportRequest = z.infer<typeof ExportRequestSchema>;

interface ExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Default data type */
  dataType?: string;
  /** Initial form data */
  initialValues?: Partial<ExportRequest>;
  /** Available export formats */
  availableFormats?: string[];
  /** Show scheduling options */
  showScheduling?: boolean;
}

const ExportModal = ({
  isOpen,
  onClose,
  dataType = '',
  initialValues,
  availableFormats = ['csv', 'xlsx', 'png', 'svg', 'pdf'],
  showScheduling = true,
}: ExportModalProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const { startExport, scheduleExport, getExportOptions } = useExportStore();

  const form = useForm<ExportRequest>({
    resolver: zodResolver(ExportRequestSchema),
    defaultValues: {
      dataType,
      format: 'pdf',
      dateRange: {
        type: 'last_7_days',
        startDate: undefined,
        endDate: undefined,
      },
      options: {
        includeCharts: true,
        includeMaps: true,
        includeImages: false,
        pageSize: 'A4',
        orientation: 'portrait',
        title: '',
        subtitle: '',
        watermark: '',
      },
      recipients: [],
      schedule: {
        frequency: 'immediate',
        time: '09:00',
        dayOfWeek: 1, // Monday
        dayOfMonth: 1,
      },
      ...initialValues,
    },
  });

  const selectedFormat = form.watch('format');
  const selectedFrequency = form.watch('schedule.frequency');
  const dateRangeType = form.watch('dateRange.type');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      form.reset({
        dataType,
        format: 'pdf',
        dateRange: {
          type: 'last_7_days',
          startDate: undefined,
          endDate: undefined,
        },
        options: {
          includeCharts: true,
          includeMaps: true,
          includeImages: false,
          pageSize: 'A4',
          orientation: 'portrait',
          title: '',
          subtitle: '',
          watermark: '',
        },
        recipients: [],
        schedule: {
          frequency: 'immediate',
          time: '09:00',
          dayOfWeek: 1,
          dayOfMonth: 1,
        },
        ...initialValues,
      });
    }
  }, [isOpen, dataType, initialValues, form]);

  const handleNext = async () => {
    const currentStepFields = getStepFields(step);
    const isStepValid = await form.trigger(currentStepFields as any);
    
    if (isStepValid) {
      if (step < 3) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const formData = form.getValues();
      
      if (formData.schedule?.frequency === 'immediate') {
        // Immediate export
        await startExport({
          dataType: formData.dataType,
          format: formData.format,
          dateRange: getDateRangeFromForm(formData.dateRange),
          filters: formData.filters,
          options: formData.options,
        });
      } else {
        // Scheduled export
        await scheduleExport({
          ...formData,
          dateRange: getDateRangeFromForm(formData.dateRange),
        } as any);
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDateRangeFromForm = (dateRange: any) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange.type) {
      case 'last_24_hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'custom':
        startDate = new Date(dateRange.startDate!);
        endDate = new Date(dateRange.endDate!);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const getStepFields = (currentStep: number): string[] => {
    switch (currentStep) {
      case 1:
        return ['dataType', 'format', 'dateRange.type'];
      case 2:
        if (dateRangeType === 'custom') {
          return ['dateRange.startDate', 'dateRange.endDate'];
        }
        return [];
      case 3:
        return ['options.includeCharts', 'options.includeMaps', 'options.includeImages'];
      case 4:
        if (showScheduling && selectedFrequency !== 'immediate') {
          return ['schedule.frequency', 'schedule.time'];
        }
        return [];
      default:
        return [];
    }
  };

  const addRecipient = () => {
    const currentRecipients = form.getValues('recipients') || [];
    form.setValue('recipients', [
      ...currentRecipients,
      { email: '', name: '', format: 'pdf' },
    ]);
  };

  const removeRecipient = (index: number) => {
    const currentRecipients = form.getValues('recipients') || [];
    form.setValue('recipients', currentRecipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: string, value: any) => {
    const currentRecipients = form.getValues('recipients') || [];
    currentRecipients[index] = { ...currentRecipients[index], [field]: value };
    form.setValue('recipients', currentRecipients);
  };

  const formatOptions = [
    { value: 'csv', label: 'CSV (Excel compatible)', description: 'Tabular data for spreadsheet analysis' },
    { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Native Excel format with formatting' },
    { value: 'png', label: 'PNG Image', description: 'High-quality image for presentations' },
    { value: 'svg', label: 'SVG Vector', description: 'Scalable vector graphics' },
    { value: 'pdf', label: 'PDF Report', description: 'Formatted report document' },
  ];

  const frequencyOptions = [
    { value: 'immediate', label: 'Immediate Export', description: 'Generate and download now' },
    { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
    { value: 'weekly', label: 'Weekly', description: 'Every week on specified day' },
    { value: 'monthly', label: 'Monthly', description: 'Every month on specified day' },
  ];

  const dayOfWeekOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {dataType}
            {step > 1 && ` - Step ${step} of 4`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Basic Export Options */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <RadioGroup
                  value={selectedFormat}
                  onValueChange={(value: any) => form.setValue('format', value as any)}
                  className="grid grid-cols-1 gap-3"
                >
                  {formatOptions
                    .filter(option => availableFormats.includes(option.value))
                    .map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="font-medium">
                            {option.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={dateRangeType}
                  onValueChange={(value) => form.setValue('dateRange.type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_24_hours">Last 24 Hours</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="current_month">Current Month</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Custom Date Range */}
          {step === 2 && dateRangeType === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.getValues('dateRange.startDate') && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.getValues('dateRange.startDate')
                          ? format(new Date(form.getValues('dateRange.startDate')!), "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.getValues('dateRange.startDate') ? new Date(form.getValues('dateRange.startDate')!) : undefined}
                        onSelect={(date) => 
                          form.setValue('dateRange.startDate', date?.toISOString())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.dateRange?.startDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.dateRange.startDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.getValues('dateRange.endDate') && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.getValues('dateRange.endDate')
                          ? format(new Date(form.getValues('dateRange.endDate')!), "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.getValues('dateRange.endDate') ? new Date(form.getValues('dateRange.endDate')!) : undefined}
                        onSelect={(date) => 
                          form.setValue('dateRange.endDate', date?.toISOString())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.dateRange?.endDate && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.dateRange.endDate.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 (alternative): Skip if not custom date range */}
          {step === 2 && dateRangeType !== 'custom' && (
            <div className="text-center py-8">
              <Download className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Date Range Selected</h3>
              <p className="text-muted-foreground">
                Using {dateRangeType.replace('_', ' ')} for export.
              </p>
            </div>
          )}

          {/* Step 3: Advanced Options */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Report Options</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={form.getValues('options.includeCharts')}
                    onCheckedChange={(checked) => 
                      form.setValue('options.includeCharts', checked as boolean)
                    }
                  />
                  <Label htmlFor="includeCharts" className="text-sm">
                    Include charts and graphs
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMaps"
                    checked={form.getValues('options.includeMaps')}
                    onCheckedChange={(checked) => 
                      form.setValue('options.includeMaps', checked as boolean)
                    }
                  />
                  <Label htmlFor="includeMaps" className="text-sm">
                    Include maps and location data
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeImages"
                    checked={form.getValues('options.includeImages')}
                    onCheckedChange={(checked) => 
                      form.setValue('options.includeImages', checked as boolean)
                    }
                  />
                  <Label htmlFor="includeImages" className="text-sm">
                    Include images and attachments
                  </Label>
                </div>
              </div>

              {selectedFormat === 'pdf' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page Size</Label>
                      <Select
                        value={form.getValues('options.pageSize')}
                        onValueChange={(value) => 
                          form.setValue('options.pageSize', value as any)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A4">A4</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Orientation</Label>
                      <Select
                        value={form.getValues('options.orientation')}
                        onValueChange={(value) => 
                          form.setValue('options.orientation', value as any)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Report Title (Optional)</Label>
                    <Input
                      placeholder="Enter custom report title"
                      {...form.register('options.title')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtitle (Optional)</Label>
                    <Input
                      placeholder="Enter report subtitle"
                      {...form.register('options.subtitle')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Watermark (Optional)</Label>
                    <Input
                      placeholder="Enter watermark text"
                      {...form.register('options.watermark')}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Scheduling (if enabled) */}
          {step === 4 && showScheduling && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Frequency</Label>
                <RadioGroup
                  value={selectedFrequency}
                  onValueChange={(value: any) => form.setValue('schedule.frequency', value as any)}
                  className="grid grid-cols-1 gap-3"
                >
                  {frequencyOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`freq-${option.value}`} />
                      <div className="flex-1">
                        <Label htmlFor={`freq-${option.value}`} className="font-medium">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {selectedFrequency !== 'immediate' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time (HH:MM)</Label>
                    <Input
                      type="time"
                      {...form.register('schedule.time')}
                      placeholder="09:00"
                    />
                    {form.formState.errors.schedule?.time && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.schedule.time.message}
                      </p>
                    )}
                  </div>

                  {selectedFrequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={form.getValues('schedule.dayOfWeek')?.toString()}
                        onValueChange={(value) => 
                          form.setValue('schedule.dayOfWeek', parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayOfWeekOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedFrequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        {...form.register('schedule.dayOfMonth', { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Email Recipients for scheduled exports */}
              {selectedFrequency !== 'immediate' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Email Recipients</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRecipient}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Add Recipient
                    </Button>
                  </div>

                  {(form.getValues('recipients') || []).map((recipient, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Email address"
                        value={recipient.email}
                        onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                      />
                      <Input
                        placeholder="Name (optional)"
                        value={recipient.name || ''}
                        onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Select
                          value={recipient.format}
                          onValueChange={(value) => updateRecipient(index, 'format', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                          disabled={(form.getValues('recipients') || []).length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(form.getValues('recipients') || []).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No recipients added. Export will be available for download.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : step < 4 ? (
                <>
                  Next
                  <Download className="h-4 w-4" />
                </>
              ) : selectedFrequency === 'immediate' ? (
                <>
                  Export Now
                  <Download className="h-4 w-4" />
                </>
              ) : (
                <>
                  Schedule Export
                  <Mail className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;