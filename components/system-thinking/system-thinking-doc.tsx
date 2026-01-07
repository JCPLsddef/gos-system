'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Doc = {
  id: string;
  input_text: string;
};

type InputItem = {
  id: string;
  content: string;
  order_index: number;
};

type Step = {
  id: string;
  title: string;
  content: string;
  order_index: number;
};

type Output = {
  result: string;
  actions: string;
  expected_outcome: string;
  notes_risks: string;
};

type Requirement = {
  id: string;
  content: string;
  checked: boolean;
  order_index: number;
};

type Constraint = {
  id: string;
  content: string;
  checked: boolean;
  order_index: number;
};

type SystemThinkingDocProps = {
  userId: string;
};

export function SystemThinkingDoc({ userId }: SystemThinkingDocProps) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [inputText, setInputText] = useState('');
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [output, setOutput] = useState<Output>({
    result: '',
    actions: '',
    expected_outcome: '',
    notes_risks: '',
  });

  const [newInputItem, setNewInputItem] = useState('');
  const [isAddingInput, setIsAddingInput] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [newConstraint, setNewConstraint] = useState('');
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);

  useEffect(() => {
    loadDoc();
  }, [userId]);

  const loadDoc = async () => {
    // Get or create doc
    let { data: docData, error: docError } = await supabase
      .from('system_thinking_docs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!docData) {
      const { data: newDoc, error: createError } = await supabase
        .from('system_thinking_docs')
        .insert({ user_id: userId, title: 'System Thinking', input_text: '' })
        .select()
        .single();

      if (createError) {
        toast.error('Failed to create document');
        return;
      }
      docData = newDoc;
    }

    setDoc(docData as Doc);
    setInputText(docData.input_text || '');

    // Load inputs
    const { data: inputsData } = await supabase
      .from('system_thinking_inputs')
      .select('*')
      .eq('doc_id', docData.id)
      .order('order_index');

    if (inputsData) setInputItems(inputsData as InputItem[]);

    // Load steps
    const { data: stepsData } = await supabase
      .from('system_thinking_steps')
      .select('*')
      .eq('doc_id', docData.id)
      .order('order_index');

    if (stepsData) setSteps(stepsData as Step[]);

    // Load requirements
    const { data: requirementsData } = await supabase
      .from('system_thinking_requirements')
      .select('*')
      .eq('doc_id', docData.id)
      .order('order_index');

    if (requirementsData) setRequirements(requirementsData as Requirement[]);

    // Load constraints
    const { data: constraintsData } = await supabase
      .from('system_thinking_constraints')
      .select('*')
      .eq('doc_id', docData.id)
      .order('order_index');

    if (constraintsData) setConstraints(constraintsData as Constraint[]);

    // Load output
    const { data: outputData } = await supabase
      .from('system_thinking_outputs')
      .select('*')
      .eq('doc_id', docData.id)
      .maybeSingle();

    if (outputData) {
      setOutput({
        result: outputData.result || '',
        actions: outputData.actions || '',
        expected_outcome: outputData.expected_outcome || '',
        notes_risks: outputData.notes_risks || '',
      });
    }
  };

  const saveInputText = async () => {
    if (!doc) return;

    const { error } = await supabase
      .from('system_thinking_docs')
      .update({ input_text: inputText })
      .eq('id', doc.id);

    if (!error) {
      toast.success('Saved');
    }
  };

  const addInputItem = async () => {
    if (!doc || !newInputItem.trim()) return;

    const { data, error } = await supabase
      .from('system_thinking_inputs')
      .insert({
        doc_id: doc.id,
        user_id: userId,
        content: newInputItem,
        order_index: inputItems.length,
      })
      .select()
      .single();

    if (!error && data) {
      setInputItems([...inputItems, data as InputItem]);
      setNewInputItem('');
      setIsAddingInput(false);
      toast.success('Added');
    }
  };

  const removeInputItem = async (id: string) => {
    await supabase.from('system_thinking_inputs').delete().eq('id', id);
    setInputItems(inputItems.filter((i) => i.id !== id));
  };

  const addStep = async () => {
    if (!doc) return;

    const { data, error } = await supabase
      .from('system_thinking_steps')
      .insert({
        doc_id: doc.id,
        user_id: userId,
        title: '',
        content: '',
        order_index: steps.length,
      })
      .select()
      .single();

    if (!error && data) {
      setSteps([...steps, data as Step]);
      toast.success('Step added');
    }
  };

  const updateStep = async (id: string, field: 'title' | 'content', value: string) => {
    const { error } = await supabase
      .from('system_thinking_steps')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }
  };

  const removeStep = async (id: string) => {
    await supabase.from('system_thinking_steps').delete().eq('id', id);
    setSteps(steps.filter((s) => s.id !== id));
    toast.success('Step removed');
  };

  const addRequirement = async () => {
    if (!newRequirement.trim() || !doc) return;

    const { data, error } = await supabase
      .from('system_thinking_requirements')
      .insert({
        doc_id: doc.id,
        user_id: userId,
        content: newRequirement.trim(),
        checked: false,
        order_index: requirements.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add requirement');
      return;
    }

    setRequirements([...requirements, data as Requirement]);
    setNewRequirement('');
    setIsAddingRequirement(false);
    toast.success('Requirement added');
  };

  const toggleRequirement = async (requirementId: string) => {
    const req = requirements.find((r) => r.id === requirementId);
    if (!req) return;

    const { error } = await supabase
      .from('system_thinking_requirements')
      .update({ checked: !req.checked })
      .eq('id', requirementId);

    if (error) {
      toast.error('Failed to update requirement');
      return;
    }

    setRequirements(requirements.map((r) => (r.id === requirementId ? { ...r, checked: !r.checked } : r)));
  };

  const removeRequirement = async (requirementId: string) => {
    const { error } = await supabase.from('system_thinking_requirements').delete().eq('id', requirementId);

    if (error) {
      toast.error('Failed to remove requirement');
      return;
    }

    setRequirements(requirements.filter((r) => r.id !== requirementId));
    toast.success('Requirement removed');
  };

  const addConstraint = async () => {
    if (!newConstraint.trim() || !doc) return;

    const { data, error } = await supabase
      .from('system_thinking_constraints')
      .insert({
        doc_id: doc.id,
        user_id: userId,
        content: newConstraint.trim(),
        checked: false,
        order_index: constraints.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add constraint');
      return;
    }

    setConstraints([...constraints, data as Constraint]);
    setNewConstraint('');
    setIsAddingConstraint(false);
    toast.success('Constraint added');
  };

  const toggleConstraint = async (constraintId: string) => {
    const con = constraints.find((c) => c.id === constraintId);
    if (!con) return;

    const { error } = await supabase
      .from('system_thinking_constraints')
      .update({ checked: !con.checked })
      .eq('id', constraintId);

    if (error) {
      toast.error('Failed to update constraint');
      return;
    }

    setConstraints(constraints.map((c) => (c.id === constraintId ? { ...c, checked: !c.checked } : c)));
  };

  const removeConstraint = async (constraintId: string) => {
    const { error } = await supabase.from('system_thinking_constraints').delete().eq('id', constraintId);

    if (error) {
      toast.error('Failed to remove constraint');
      return;
    }

    setConstraints(constraints.filter((c) => c.id !== constraintId));
    toast.success('Constraint removed');
  };

  const saveOutput = async () => {
    if (!doc) return;

    const { data: existing } = await supabase
      .from('system_thinking_outputs')
      .select('*')
      .eq('doc_id', doc.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('system_thinking_outputs').update(output).eq('doc_id', doc.id);
    } else {
      await supabase.from('system_thinking_outputs').insert({
        doc_id: doc.id,
        user_id: userId,
        ...output,
      });
    }

    toast.success('Output saved');
  };

  return (
    <div className="space-y-6">
      {/* INPUT SECTION */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <h2 className="text-3xl font-bold text-white mb-4">INPUT</h2>

        <div className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onBlur={saveInputText}
            placeholder="Describe the situation, problem, or opportunity..."
            className="bg-slate-800 border-slate-600 text-white min-h-[120px]"
          />

          <div className="space-y-2">
            {inputItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded px-3 py-2"
              >
                <span className="text-slate-400">•</span>
                <span className="flex-1 text-white">{item.content}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInputItem(item.id)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {isAddingInput && (
              <div className="flex gap-2">
                <Input
                  value={newInputItem}
                  onChange={(e) => setNewInputItem(e.target.value)}
                  placeholder="Input item..."
                  className="bg-slate-800 border-slate-600 text-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addInputItem();
                    if (e.key === 'Escape') setIsAddingInput(false);
                  }}
                />
                <Button onClick={addInputItem} size="sm" className="bg-blue-600">
                  Add
                </Button>
              </div>
            )}

            {!isAddingInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingInput(true)}
                className="border-slate-600 text-slate-300"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Input Item
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* PROCESS SECTION */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">PROCESS</h2>
          <Button onClick={addStep} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-500" />
                <span className="text-lg font-bold text-blue-400">Step {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(step.id)}
                  className="ml-auto text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={step.title}
                onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                placeholder="Step title..."
                className="bg-slate-900 border-slate-600 text-white font-semibold"
              />

              <Textarea
                value={step.content}
                onChange={(e) => updateStep(step.id, 'content', e.target.value)}
                placeholder="Step description..."
                className="bg-slate-900 border-slate-600 text-white min-h-[80px]"
              />
            </div>
          ))}

          {steps.length === 0 && (
            <div className="text-center py-8 text-slate-400">No steps yet. Break down the process.</div>
          )}
        </div>
      </Card>

      {/* REQUIREMENTS SECTION */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">REQUIREMENTS</h2>
          <Button
            onClick={() => setIsAddingRequirement(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Requirement
          </Button>
        </div>

        <div className="space-y-3">
          {requirements.map((req) => (
            <div
              key={req.id}
              className="flex items-start gap-3 bg-slate-800/50 border border-slate-700 rounded px-4 py-3 group hover:border-slate-600 transition-colors"
            >
              <button
                onClick={() => toggleRequirement(req.id)}
                className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  req.checked ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-600 hover:border-blue-500'
                }`}
              >
                {req.checked && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 text-white ${req.checked ? 'line-through text-slate-400' : ''}`}>
                {req.content}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRequirement(req.id)}
                className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {requirements.length === 0 && !isAddingRequirement && (
            <p className="text-slate-400 text-center py-6">No requirements defined yet. Add one to get started.</p>
          )}

          {isAddingRequirement && (
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Enter requirement..."
                className="bg-slate-800 border-slate-600 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addRequirement();
                  if (e.key === 'Escape') {
                    setIsAddingRequirement(false);
                    setNewRequirement('');
                  }
                }}
              />
              <Button onClick={addRequirement} size="sm" className="bg-blue-600 hover:bg-blue-700">
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAddingRequirement(false);
                  setNewRequirement('');
                }}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* CONSTRAINTS SECTION */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">CONSTRAINTS</h2>
          <Button
            onClick={() => setIsAddingConstraint(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Constraint
          </Button>
        </div>

        <div className="space-y-3">
          {constraints.map((con) => (
            <div
              key={con.id}
              className="flex items-start gap-3 bg-slate-800/50 border border-slate-700 rounded px-4 py-3 group hover:border-slate-600 transition-colors"
            >
              <button
                onClick={() => toggleConstraint(con.id)}
                className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  con.checked ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-600 hover:border-blue-500'
                }`}
              >
                {con.checked && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 text-white ${con.checked ? 'line-through text-slate-400' : ''}`}>
                {con.content}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeConstraint(con.id)}
                className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {constraints.length === 0 && !isAddingConstraint && (
            <p className="text-slate-400 text-center py-6">No constraints defined yet. Add one to get started.</p>
          )}

          {isAddingConstraint && (
            <div className="flex gap-2">
              <Input
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                placeholder="Enter constraint..."
                className="bg-slate-800 border-slate-600 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addConstraint();
                  if (e.key === 'Escape') {
                    setIsAddingConstraint(false);
                    setNewConstraint('');
                  }
                }}
              />
              <Button onClick={addConstraint} size="sm" className="bg-blue-600 hover:bg-blue-700">
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAddingConstraint(false);
                  setNewConstraint('');
                }}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* OUTPUT SECTION */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-white">OUTPUT</h2>
          <Button onClick={saveOutput} size="sm" className="bg-green-600 hover:bg-green-700">
            Save Output
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Result / Decision</label>
            <Textarea
              value={output.result}
              onChange={(e) => setOutput({ ...output, result: e.target.value })}
              placeholder="What is the expected result or decision?"
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Actions</label>
            <Textarea
              value={output.actions}
              onChange={(e) => setOutput({ ...output, actions: e.target.value })}
              placeholder="What actions need to be taken?"
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Expected Outcome / Gain</label>
            <Textarea
              value={output.expected_outcome}
              onChange={(e) => setOutput({ ...output, expected_outcome: e.target.value })}
              placeholder="What is the expected outcome or benefit?"
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Notes / Risks</label>
            <Textarea
              value={output.notes_risks}
              onChange={(e) => setOutput({ ...output, notes_risks: e.target.value })}
              placeholder="Any notes, risks, or considerations?"
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
