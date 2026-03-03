"use client";

import {
  Children,
  type ReactNode,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SelectHTMLAttributes,
} from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
  groupLabel?: string;
};

type AppSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  fitContent?: boolean;
  noRightPadding?: boolean;
  containerClassName?: string;
};

function collectOptions(children: ReactNode, groupLabel?: string): SelectOption[] {
  const items: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (child.type === "option") {
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };
      items.push({
        value: String(props.value ?? ""),
        label: typeof props.children === "string" ? props.children : String(props.children ?? ""),
        disabled: Boolean(props.disabled),
        groupLabel,
      });
      return;
    }

    if (child.type === "optgroup") {
      const props = child.props as {
        label?: string;
        children?: ReactNode;
      };
      items.push(...collectOptions(props.children, props.label));
    }
  });

  return items;
}

export function AppSelect({
  children,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  className,
  fitContent = false,
  noRightPadding = false,
  containerClassName,
  required,
  id,
}: AppSelectProps) {
  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;
  const firstEnabledValue = options.find((option) => !option.disabled)?.value ?? "";
  const initialValue =
    defaultValue !== undefined ? String(defaultValue) : (value !== undefined ? String(value) : firstEnabledValue);
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef(false);

  const selectedValue = isControlled ? String(value ?? "") : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const selectedLabel = selectedOption?.label ?? "";
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const useInlineChevron = fitContent && noRightPadding;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    function closeFromGlobal() {
      if (!openRef.current) {
        return;
      }
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.blur();
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        closeFromGlobal();
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeFromGlobal();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function getDefaultActiveIndex() {
    const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    if (selectedIndex >= 0) {
      return selectedIndex;
    }

    return firstEnabledIndex;
  }

  function commitValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    if (onChange) {
      const syntheticEvent = {
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      } as unknown as ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  }

  function moveActiveIndex(direction: 1 | -1) {
    if (options.length === 0) {
      return;
    }

    let index = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      index = (index + direction + options.length) % options.length;
      if (!options[index]?.disabled) {
        setActiveIndex(index);
        break;
      }
    }
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(getDefaultActiveIndex());
        return;
      }
      moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        const lastEnabledIndex = [...options].reverse().findIndex((option) => !option.disabled);
        if (lastEnabledIndex >= 0) {
          setActiveIndex(options.length - lastEnabledIndex - 1);
        } else {
          setActiveIndex(-1);
        }
        return;
      }
      moveActiveIndex(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(getDefaultActiveIndex());
        return;
      }
      if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex]?.disabled) {
        commitValue(options[activeIndex]!.value);
      }
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.blur();
      return;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${fitContent ? "w-auto" : "w-full min-w-0"} ${containerClassName ?? ""}`.trim()}
    >
      {name ? <input type="hidden" name={name} value={selectedValue} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((current) => {
            const next = !current;
            setActiveIndex(next ? getDefaultActiveIndex() : -1);
            if (!next) {
              triggerRef.current?.blur();
            }
            return next;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`${className ?? ""} relative ${fitContent ? "inline-flex w-auto" : "flex w-full min-w-0"} items-center text-left focus:outline-none focus-visible:outline-none`.trim()}
      >
        <span
          className={`${
            fitContent
              ? useInlineChevron
                ? "pr-0 text-left"
                : "pr-7 text-left"
              : "min-w-0 flex-1 truncate pr-7 text-left"
          }`}
        >
          {selectedLabel}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={`pointer-events-none text-slate-500 transition-transform duration-200 ${
            useInlineChevron
              ? "ml-0.5 h-5 w-5 shrink-0"
              : "absolute right-2.5 top-1/2 h-5 w-5 -translate-y-1/2"
          } ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <path d="M7 10l5 5 5-5z" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-300 bg-white py-1 shadow-xl">
          <ul role="listbox" aria-labelledby={id}>
            {options.map((option, index) => {
              const selected = option.value === selectedValue;
              const active = index === activeIndex;
              return (
                <li key={`${option.groupLabel ?? "option"}:${option.value}`} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (option.disabled) {
                        return;
                      }
                      commitValue(option.value);
                      setOpen(false);
                      setActiveIndex(-1);
                      triggerRef.current?.blur();
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      option.disabled
                        ? "cursor-not-allowed text-slate-400"
                        : active
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">
                      {option.groupLabel ? `${option.groupLabel} · ${option.label}` : option.label}
                    </span>
                    {selected ? (
                      <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        className="h-4 w-4 shrink-0 text-green-700"
                      >
                        <path
                          d="M7.6 13.3 4.3 10l-1.1 1.1 4.4 4.4L16.8 6.3l-1.1-1.1z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
