'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowDown, ArrowRight } from 'lucide-react';

type SkillCycleData = {
  target: string;
  knowledge: string;
  test: string;
  evaluate: string;
  hypothesis: string;
};

type SystemData = {
  opportunity: string;
  productService: string;
  value: string;
  time: string;
  energy: string;
  tools: string;
  skills: string;
};

export default function GeniusPlannerPage() {
  const { user } = useAuth();
  const [skillCycle, setSkillCycle] = useState<SkillCycleData>({
    target: '',
    knowledge: '',
    test: '',
    evaluate: '',
    hypothesis: '',
  });
  const [systemData, setSystemData] = useState<SystemData>({
    opportunity: '',
    productService: '',
    value: '',
    time: '',
    energy: '',
    tools: '',
    skills: '',
  });

  // Load from localStorage
  useEffect(() => {
    if (user) {
      const savedSkillCycle = localStorage.getItem(`genius-skill-cycle-${user.id}`);
      const savedSystem = localStorage.getItem(`genius-system-${user.id}`);
      
      if (savedSkillCycle) {
        try {
          setSkillCycle(JSON.parse(savedSkillCycle));
        } catch (e) {
          console.error('Failed to load skill cycle:', e);
        }
      }
      
      if (savedSystem) {
        try {
          setSystemData(JSON.parse(savedSystem));
        } catch (e) {
          console.error('Failed to load system data:', e);
        }
      }
    }
  }, [user]);

  // Auto-save to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`genius-skill-cycle-${user.id}`, JSON.stringify(skillCycle));
    }
  }, [skillCycle, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`genius-system-${user.id}`, JSON.stringify(systemData));
    }
  }, [systemData, user]);

  const handleSkillCycleChange = (field: keyof SkillCycleData, value: string) => {
    setSkillCycle(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemChange = (field: keyof SystemData, value: string) => {
    setSystemData(prev => ({ ...prev, [field]: value }));
  };

  const handleClearSkillCycle = () => {
    setSkillCycle({
      target: '',
      knowledge: '',
      test: '',
      evaluate: '',
      hypothesis: '',
    });
    toast.success('Skill Cycle cleared');
  };

  const handleClearSystem = () => {
    setSystemData({
      opportunity: '',
      productService: '',
      value: '',
      time: '',
      energy: '',
      tools: '',
      skills: '',
    });
    toast.success('System cleared');
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">GENIUS PLANNER</h1>
        <p className="text-slate-400 text-lg">Strategic thinking & system design frameworks</p>
      </div>

      {/* Skill Building Cycle */}
      <Card className="bg-slate-900/50 border-slate-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Skill Building Cycle</h2>
          <Button
            onClick={handleClearSkillCycle}
            variant="outline"
            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            Clear
          </Button>
        </div>

        <div className="relative">
          {/* Center: Collect Knowledge */}
          <div className="flex flex-col items-center mb-12">
            <div className="bg-slate-800 border-2 border-blue-500 rounded-lg p-4 mb-4 w-full max-w-md">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Pick a Clear Target Output
              </label>
              <Textarea
                value={skillCycle.target}
                onChange={(e) => handleSkillCycleChange('target', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white resize-none"
                placeholder="What is your target outcome?"
                rows={2}
              />
            </div>

            <ArrowDown className="w-6 h-6 text-blue-400 mb-4" />

            <div className="bg-slate-800 border-2 border-green-500 rounded-lg p-4 w-full max-w-md">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Collect Knowledge
              </label>
              <Textarea
                value={skillCycle.knowledge}
                onChange={(e) => handleSkillCycleChange('knowledge', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white resize-none"
                placeholder="What knowledge do you need?"
                rows={2}
              />
            </div>
          </div>

          {/* Cycle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Right: Test Running the System */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-800 border-2 border-amber-500 rounded-lg p-4 w-full">
                <label className="text-slate-300 text-sm font-medium mb-2 block">
                  Test Running the System
                </label>
                <Textarea
                  value={skillCycle.test}
                  onChange={(e) => handleSkillCycleChange('test', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white resize-none"
                  placeholder="How will you test your system?"
                  rows={3}
                />
              </div>
              <ArrowDown className="w-6 h-6 text-amber-400 my-4" />
            </div>

            {/* Left: Make a New Hypothesis */}
            <div className="flex flex-col items-center md:order-last">
              <ArrowDown className="w-6 h-6 text-purple-400 my-4 md:hidden" />
              <div className="bg-slate-800 border-2 border-purple-500 rounded-lg p-4 w-full md:mt-auto">
                <label className="text-slate-300 text-sm font-medium mb-2 block">
                  Make a New Hypothesis
                </label>
                <Textarea
                  value={skillCycle.hypothesis}
                  onChange={(e) => handleSkillCycleChange('hypothesis', e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white resize-none"
                  placeholder="What's your next hypothesis?"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Bottom: Evaluate Your Output */}
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 border-2 border-red-500 rounded-lg p-4 w-full max-w-md">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Evaluate Your Output
              </label>
              <Textarea
                value={skillCycle.evaluate}
                onChange={(e) => handleSkillCycleChange('evaluate', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white resize-none"
                placeholder="How did you perform?"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              If you hit the target outcome, congrats, you actually{' '}
              <span className="text-green-400 font-bold">HAVE the skill</span>
            </p>
          </div>
        </div>
      </Card>

      {/* System Framework */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">System Framework</h2>
          <Button
            onClick={handleClearSystem}
            variant="outline"
            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Inputs */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Inputs</h3>
            <div className="bg-slate-800 border-2 border-blue-500 rounded-lg p-4">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Opportunity
              </label>
              <Textarea
                value={systemData.opportunity}
                onChange={(e) => handleSystemChange('opportunity', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white resize-none"
                placeholder="What opportunity are you pursuing?"
                rows={3}
              />
            </div>
            <ArrowRight className="w-6 h-6 text-blue-400 mx-auto md:hidden" />
          </div>

          {/* System */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">System</h3>
            <div className="bg-slate-800 border-4 border-white rounded-lg p-6 min-h-[300px] flex items-center justify-center">
              <div className="text-center space-y-4 w-full">
                <p className="text-white text-lg font-bold mb-4">Requirements</p>
                
                <div className="space-y-2">
                  <Input
                    value={systemData.time}
                    onChange={(e) => handleSystemChange('time', e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="• Time"
                  />
                  <Input
                    value={systemData.energy}
                    onChange={(e) => handleSystemChange('energy', e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="• Energy"
                  />
                  <Input
                    value={systemData.tools}
                    onChange={(e) => handleSystemChange('tools', e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="• Tools"
                  />
                  <Input
                    value={systemData.skills}
                    onChange={(e) => handleSystemChange('skills', e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="• Skills"
                  />
                </div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-green-400 mx-auto md:hidden" />
          </div>

          {/* Outputs */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Outputs</h3>
            <div className="bg-slate-800 border-2 border-green-500 rounded-lg p-4">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                Product/Service
              </label>
              <Textarea
                value={systemData.productService}
                onChange={(e) => handleSystemChange('productService', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white resize-none"
                placeholder="What product/service do you create?"
                rows={2}
              />
            </div>
            
            <div className="bg-slate-800 border-2 border-emerald-500 rounded-lg p-4">
              <label className="text-slate-300 text-sm font-medium mb-2 block">
                How much do others value this?
              </label>
              <Input
                value={systemData.value}
                onChange={(e) => handleSystemChange('value', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="$$"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
