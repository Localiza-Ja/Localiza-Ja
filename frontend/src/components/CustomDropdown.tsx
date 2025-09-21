//frontend/src/components/CustomDropdown.tsx

import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
} from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { COLORS } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { Platform } from "react-native";

interface DropdownItem {
  label: string;
  value: string;
}
interface CustomDropdownProps {
  label: string;
  data: DropdownItem[];
  value: string | null;
  onChange: (item: DropdownItem) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onPress: () => void;
}

const CustomDropdown = forwardRef(
  (props: CustomDropdownProps, ref: ForwardedRef<{ open: () => void }>) => {
    const {
      label,
      data,
      value,
      onChange,
      placeholder,
      onFocus,
      onBlur,
      onPress,
    } = props;

    const dropdownRef = useRef<any>(null);
    const scale = useSharedValue(1);
    const pressProgress = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      open() {
        dropdownRef.current?.open();
      },
    }));

    const animatedStyle = useAnimatedStyle(() => {
      const animatedBorderColor = interpolateColor(
        pressProgress.value,
        [0, 1],
        [COLORS.border, COLORS.primary]
      );
      const animatedShadowOpacity = interpolate(
        pressProgress.value,
        [0, 1],
        [0.1, 0.2]
      );
      const animatedShadowRadius = interpolate(
        pressProgress.value,
        [0, 1],
        [4, 8]
      );
      const animatedElevation = interpolate(
        pressProgress.value,
        [0, 1],
        [3, 8]
      );
      return {
        transform: [{ scale: scale.value }],
        borderColor: animatedBorderColor,
        shadowOpacity: animatedShadowOpacity,
        shadowRadius: animatedShadowRadius,
        elevation: animatedElevation,
      };
    });

    const handlePressIn = () => {
      scale.value = withSpring(0.98);
      pressProgress.value = withTiming(1, { duration: 100 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      pressProgress.value = withTiming(0, { duration: 200 });
    };

    const renderDropdownItem = (item: DropdownItem) => {
      const isSelected = item.value === value;
      const index = data.findIndex((d) => d.value === item.value);
      const isEven = index % 2 === 0;
      return (
        <View
          style={[
            styles.listItemContainer,
            isEven ? null : styles.listItemContainerOdd,
            isSelected && styles.selectedListItemContainer,
          ]}
        >
          <Text
            style={[
              styles.listItemText,
              isSelected && styles.selectedListItemText,
            ]}
            allowFontScaling={false}
          >
            {item.label}
          </Text>
        </View>
      );
    };

    return (
      <View className="w-full mb-4">
        <Text
          className="text-text-secondary font-semibold mb-2 ml-1 text-sm"
          allowFontScaling={false}
        >
          {label}
        </Text>
        <View style={{ position: "relative", width: "100%", height: 58 }}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={{ zIndex: 10 }}
          >
            <Animated.View style={[styles.dropdown, animatedStyle]}>
              <Text
                style={
                  value ? styles.selectedTextStyle : styles.placeholderStyle
                }
                allowFontScaling={false}
              >
                {value
                  ? data.find((item) => item.value === value)?.label
                  : placeholder}
              </Text>
              <Ionicons
                name="chevron-down"
                size={22}
                color={COLORS["text-secondary"]}
              />
            </Animated.View>
          </Pressable>
          <View style={styles.realDropdownContainer}>
            <Dropdown
              ref={dropdownRef}
              style={styles.realDropdownStyle}
              containerStyle={[styles.containerStyle, styles.shadow]}
              renderItem={renderDropdownItem}
              data={data}
              maxHeight={200}
              labelField="label"
              valueField="value"
              value={value}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              dropdownPosition="bottom"
              placeholder={placeholder}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
            />
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  dropdown: {
    height: Platform.OS === "android" ? 48 : 58,
    width: "100%",
    backgroundColor: COLORS["input-background"],
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  realDropdownContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    opacity: 0,
  },
  realDropdownStyle: { width: "100%", height: "100%" },
  containerStyle: {
    borderRadius: 12,
    backgroundColor: COLORS["input-background"],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: "hidden",
  },
  listItemContainer: {
    paddingVertical: 17,
    paddingHorizontal: 16,
    backgroundColor: COLORS["input-background"],
  },
  listItemContainerOdd: { backgroundColor: COLORS.gray?.[200] || "#F8F9FA" },
  listItemText: { color: COLORS["text-primary"], fontSize: 14 },
  selectedListItemContainer: {
    backgroundColor: COLORS["ui-border"] || "#E9ECEF",
  },
  selectedListItemText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  placeholderStyle: { fontSize: 14, color: COLORS.placeholder },
  selectedTextStyle: { fontSize: 14, color: COLORS["text-primary"] },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default CustomDropdown;
