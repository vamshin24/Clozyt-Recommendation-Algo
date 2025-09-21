"use client";

import { useEffect, useState } from "react";
import { sendFeedback } from "../../lib/recs";
import { useUserStore, UserProfile } from "../../lib/store";

const styleOptions = ["minimal", "streetwear", "casual", "formal", "sporty", "boho"] as const;

type FormState = {
  name: string;
  email: string;
  gender: UserProfile["gender"];
  age: string;
  budgetMin: string;
  budgetMax: string;
  styles: string[];
};

const asNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ProfileForm = () => {
  const profile = useUserStore((state) => state.profile);
  const setProfile = useUserStore((state) => state.setProfile);
  const userId = useUserStore((state) => state.userId);

  const [formState, setFormState] = useState<FormState>({
    name: profile.name,
    email: profile.email,
    gender: profile.gender,
    age: profile.age ? String(profile.age) : "",
    budgetMin: profile.budgetMin ? String(profile.budgetMin) : "",
    budgetMax: profile.budgetMax ? String(profile.budgetMax) : "",
    styles: profile.styles ?? [],
  });

  useEffect(() => {
    setFormState({
      name: profile.name,
      email: profile.email,
      gender: profile.gender,
      age: profile.age ? String(profile.age) : "",
      budgetMin: profile.budgetMin ? String(profile.budgetMin) : "",
      budgetMax: profile.budgetMax ? String(profile.budgetMax) : "",
      styles: profile.styles ?? [],
    });
  }, [profile]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const toggleStyle = (style: string) => {
    setFormState((prev) => {
      const styles = prev.styles.includes(style)
        ? prev.styles.filter((tag) => tag !== style)
        : [...prev.styles, style];
      return { ...prev, styles };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ageNumber = asNumber(formState.age);
    const budgetMinNumber = asNumber(formState.budgetMin);
    const budgetMaxNumber = asNumber(formState.budgetMax);

    const nextProfile: UserProfile = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      gender: formState.gender,
      styles: formState.styles,
      ...(ageNumber !== undefined ? { age: ageNumber } : {}),
      ...(budgetMinNumber !== undefined ? { budgetMin: budgetMinNumber } : {}),
      ...(budgetMaxNumber !== undefined ? { budgetMax: budgetMaxNumber } : {}),
    };

    setProfile(nextProfile);

    await sendFeedback([
      {
        type: "profile_update",
        user_id: userId,
        ts: Date.now(),
        profile: {
          name: nextProfile.name || undefined,
          email: nextProfile.email || undefined,
          gender: nextProfile.gender,
          styles: nextProfile.styles.length ? nextProfile.styles : undefined,
          age: nextProfile.age,
          budgetMin: nextProfile.budgetMin,
          budgetMax: nextProfile.budgetMax,
        },
      },
    ]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formState.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formState.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          value={formState.gender}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="nonbinary">Non-binary</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700">
            Age
          </label>
          <input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            min={0}
            value={formState.age}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700">
            Budget Min (USD)
          </label>
          <input
            id="budgetMin"
            name="budgetMin"
            type="number"
            inputMode="numeric"
            min={0}
            value={formState.budgetMin}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700">
            Budget Max (USD)
          </label>
          <input
            id="budgetMax"
            name="budgetMax"
            type="number"
            inputMode="numeric"
            min={0}
            value={formState.budgetMax}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700">Style Tags</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {styleOptions.map((style) => {
            const isSelected = formState.styles.includes(style);
            return (
              <button
                key={style}
                type="button"
                onClick={() => toggleStyle(style)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
