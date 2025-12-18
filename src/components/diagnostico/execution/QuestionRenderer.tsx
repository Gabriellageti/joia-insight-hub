import { useState } from "react";
import { Check, X, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TemplateQuestion } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionRendererProps {
  question: TemplateQuestion;
  value: string | number | boolean | string[] | null;
  onChange: (value: string | number | boolean | string[] | null) => void;
}

export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const renderYesNo = () => {
    const isYes = value === true || value === "yes";
    const isNo = value === false || value === "no";

    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onChange(true)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all",
            isYes
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
              : "border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isYes ? "bg-emerald-500 text-white" : "bg-muted"
          )}>
            <Check className="h-6 w-6" />
          </div>
          <span className={cn(
            "text-lg font-medium",
            isYes ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
          )}>
            Sim
          </span>
        </button>

        <button
          onClick={() => onChange(false)}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all",
            isNo
              ? "border-destructive bg-destructive/10"
              : "border-border hover:border-destructive/50 hover:bg-destructive/5"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isNo ? "bg-destructive text-white" : "bg-muted"
          )}>
            <X className="h-6 w-6" />
          </div>
          <span className={cn(
            "text-lg font-medium",
            isNo ? "text-destructive" : "text-foreground"
          )}>
            Não
          </span>
        </button>
      </div>
    );
  };

  const renderScale = () => {
    const minVal = question.minValue ?? 1;
    const maxVal = question.maxValue ?? 10;
    const currentValue = typeof value === "number" ? value : minVal;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <span className="text-5xl font-bold text-accent">{currentValue}</span>
        </div>
        <Slider
          value={[currentValue]}
          onValueChange={([v]) => onChange(v)}
          min={minVal}
          max={maxVal}
          step={1}
          className="py-4"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{minVal}</span>
          <span>{maxVal}</span>
        </div>
      </div>
    );
  };

  const renderNumber = () => {
    const currentValue = typeof value === "number" ? value : "";
    const unit = (question as any).unit;

    return (
      <div className="max-w-md">
        <div className="relative">
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              onChange(isNaN(num) ? null : num);
            }}
            placeholder={question.placeholder || "Digite o valor"}
            className="text-lg h-12"
            min={question.minValue ?? undefined}
            max={question.maxValue ?? undefined}
          />
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {unit === "moeda" ? "R$" : unit === "percentual" ? "%" : ""}
            </span>
          )}
        </div>
        {(question.minValue != null || question.maxValue != null) && (
          <p className="text-sm text-muted-foreground mt-2">
            {question.minValue != null && `Mínimo: ${question.minValue}`}
            {question.minValue != null && question.maxValue != null && " • "}
            {question.maxValue != null && `Máximo: ${question.maxValue}`}
          </p>
        )}
      </div>
    );
  };

  const renderText = () => {
    const currentValue = typeof value === "string" ? value : "";

    return (
      <Textarea
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || "Digite sua resposta..."}
        className="min-h-[120px] text-base"
      />
    );
  };

  const renderMultipleChoice = () => {
    const options = question.optionsWithWeight?.length
      ? question.optionsWithWeight.map((o) => o.label)
      : question.options || [];

    const isMultiple = question.type === "multiple_choice" && Array.isArray(value);
    const selectedValues = Array.isArray(value) ? value : value ? [String(value)] : [];

    if (options.length <= 5) {
      // Radio/checkbox visual for few options
      return (
        <div className="space-y-3">
          {options.map((option, idx) => {
            const isSelected = selectedValues.includes(option);
            return (
              <button
                key={idx}
                onClick={() => {
                  if (isMultiple) {
                    const newValues = isSelected
                      ? selectedValues.filter((v) => v !== option)
                      : [...selectedValues, option];
                    onChange(newValues);
                  } else {
                    onChange(option);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all",
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  isSelected ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground"
                )}>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
                <span className="text-base">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    // Fallback to standard radio group for many options
    return (
      <RadioGroup
        value={typeof value === "string" ? value : ""}
        onValueChange={onChange}
        className="space-y-2"
      >
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
            <RadioGroupItem value={option} id={`option-${idx}`} />
            <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  const renderAttachment = () => {
    const fileName = typeof value === "string" ? value : null;

    return (
      <div className="space-y-4">
        {fileName ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
            <FileText className="h-8 w-8 text-accent" />
            <div className="flex-1">
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">Arquivo anexado</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              Remover
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Arraste um arquivo ou clique para selecionar</p>
            <Button variant="outline" onClick={() => onChange("arquivo_exemplo.pdf")}>
              Selecionar arquivo
            </Button>
            {question.allowedFileTypes && (
              <p className="text-xs text-muted-foreground mt-3">
                Formatos aceitos: {question.allowedFileTypes.join(", ")}
              </p>
            )}
            {question.maxFileSizeMB && (
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: {question.maxFileSizeMB}MB
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  switch (question.type) {
    case "yes_no":
      return renderYesNo();
    case "scale":
      return renderScale();
    case "number":
      return renderNumber();
    case "text":
      return renderText();
    case "multiple_choice":
      return renderMultipleChoice();
    case "attachment":
      return renderAttachment();
    default:
      return (
        <p className="text-muted-foreground">
          Tipo de pergunta não suportado: {question.type}
        </p>
      );
  }
}
